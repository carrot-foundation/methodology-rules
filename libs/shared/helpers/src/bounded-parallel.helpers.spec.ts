import { createDeferred } from '@carrot-fndn/shared/testing';

import {
  boundedParallelFetchInOrder,
  DEFAULT_FETCH_CONCURRENCY,
} from './bounded-parallel.helpers';

const flushMicrotasks = async (): Promise<void> => {
  // Several awaits to allow chained .then handlers to run.
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
};

const collect = async <Task, Value>(
  generator: AsyncGenerator<{ index: number; task: Task; value: Value }>,
): Promise<Array<{ index: number; task: Task; value: Value }>> => {
  const out: Array<{ index: number; task: Task; value: Value }> = [];

  for await (const item of generator) {
    out.push(item);
  }

  return out;
};

const fetchStringByTask = (task: string): Promise<string> =>
  Promise.resolve(`value-${task}`);

const fetchStringByNumber = (task: number): Promise<string> =>
  Promise.resolve(`value-${task}`);

describe('boundedParallelFetchInOrder', () => {
  it('exports a default concurrency constant of 10', () => {
    expect(DEFAULT_FETCH_CONCURRENCY).toBe(10);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws a RangeError when concurrency is %s',
    async (invalidConcurrency) => {
      await expect(
        collect(
          boundedParallelFetchInOrder(
            [1, 2, 3],
            (t) => Promise.resolve(t),
            invalidConcurrency,
          ),
        ),
      ).rejects.toBeInstanceOf(RangeError);
    },
  );

  it('yields nothing for an empty task list', async () => {
    const fetchOne = vi.fn();
    const result = await collect(boundedParallelFetchInOrder([], fetchOne, 10));

    expect(result).toEqual([]);
    expect(fetchOne).not.toHaveBeenCalled();
  });

  it('yields a single task', async () => {
    const fetchOne = vi.fn(fetchStringByTask);
    const result = await collect(
      boundedParallelFetchInOrder(['a'], fetchOne, 10),
    );

    expect(result).toEqual([{ index: 0, task: 'a', value: 'value-a' }]);
    expect(fetchOne).toHaveBeenCalledTimes(1);
  });

  it('yields tasks in input order when concurrency equals task count', async () => {
    const fetchOne = vi.fn((task: number) => Promise.resolve(task * 10));
    const result = await collect(
      boundedParallelFetchInOrder([1, 2, 3], fetchOne, 3),
    );

    expect(result).toEqual([
      { index: 0, task: 1, value: 10 },
      { index: 1, task: 2, value: 20 },
      { index: 2, task: 3, value: 30 },
    ]);
  });

  it('yields tasks in input order when task count exceeds concurrency', async () => {
    const tasks = Array.from({ length: 25 }, (_, index) => index);
    const fetchOne = vi.fn(fetchStringByNumber);

    const result = await collect(
      boundedParallelFetchInOrder(tasks, fetchOne, 10),
    );

    expect(result).toHaveLength(25);
    expect(result.map((item) => item.index)).toEqual(tasks);
    expect(result.map((item) => item.value)).toEqual(
      tasks.map((t) => `value-${t}`),
    );
  });

  it('yields tasks in input order even when resolutions arrive out of order', async () => {
    const deferreds = Array.from({ length: 5 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) =>
      deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1, 2, 3, 4], fetchOne, 5),
    );

    // Resolve in reverse order
    deferreds[4]!.resolve('value-4');
    deferreds[3]!.resolve('value-3');
    deferreds[2]!.resolve('value-2');
    deferreds[1]!.resolve('value-1');
    deferreds[0]!.resolve('value-0');

    const result = await resultPromise;

    expect(result).toEqual([
      { index: 0, task: 0, value: 'value-0' },
      { index: 1, task: 1, value: 'value-1' },
      { index: 2, task: 2, value: 'value-2' },
      { index: 3, task: 3, value: 'value-3' },
      { index: 4, task: 4, value: 'value-4' },
    ]);
  });

  it('never has more than `concurrency` fetches outstanding at once', async () => {
    let active = 0;
    let peak = 0;

    const fetchOne = async (task: number) => {
      active += 1;
      peak = Math.max(peak, active);
      // Yield to event loop so other fetches can start
      await Promise.resolve();
      await Promise.resolve();
      active -= 1;

      return task;
    };

    await collect(
      boundedParallelFetchInOrder(
        Array.from({ length: 25 }, (_, index) => index),
        fetchOne,
        10,
      ),
    );

    expect(peak).toBeLessThanOrEqual(10);
    expect(peak).toBe(10);
  });

  it('caps inFlight + buffered values when the consumer drains slowly', async () => {
    let held = 0;
    let peakHeld = 0;

    const fetchOne = (task: number): Promise<number> => {
      held += 1;
      peakHeld = Math.max(peakHeld, held);

      return Promise.resolve(task);
    };

    const generator = boundedParallelFetchInOrder(
      Array.from({ length: 50 }, (_, index) => index),
      fetchOne,
      10,
    );

    for await (const { value } of generator) {
      // Consumer "releases" the slot by pulling the value; simulate slow
      // consumer work between yields so the buffer has opportunity to fill.
      held -= 1;
      expect(value).toBeGreaterThanOrEqual(0);
      await flushMicrotasks();
      // After the consumer pull, at most concurrency tasks remain tracked
      // (inFlight + buffered) — one slot was freed but the next task may
      // already be in flight from the dispatch-before-yield ordering.
      expect(held).toBeLessThanOrEqual(10);
    }

    // dispatch() fires the next task BEFORE yield delivers the current value to
    // the consumer, so the transient peak is concurrency + 1 (the current task
    // lands in the consumer's hands while the next one starts). A naive
    // dispatcher that ignores fetched.size would grow without bound here.
    expect(peakHeld).toBeLessThanOrEqual(11);
  });

  it('does not start task 11 while the walker is blocked on task 0', async () => {
    const deferreds = Array.from({ length: 15 }, () =>
      createDeferred<string>(),
    );
    const fetchOne = vi.fn(
      (_task: number, index: number) => deferreds[index]!.promise,
    );

    // Track the background collect so we can await it at the end; any error
    // is intentionally swallowed here — the test only cares about call counts.
    let backgroundError: unknown;
    const backgroundPromise = (async () => {
      try {
        await collect(
          boundedParallelFetchInOrder(
            Array.from({ length: 15 }, (_, index) => index),
            fetchOne,
            10,
          ),
        );
      } catch (error: unknown) {
        backgroundError = error;
      }
    })();

    await flushMicrotasks();
    expect(fetchOne).toHaveBeenCalledTimes(10);

    // Resolve slots 1..9 (slot 0 still pending)
    for (let index = 1; index < 10; index += 1) {
      deferreds[index]!.resolve(`value-${index}`);
    }
    await flushMicrotasks();

    // Walker is blocked on slot 0 → no new fetches should fire
    expect(fetchOne).toHaveBeenCalledTimes(10);

    // Resolve slot 0 — walker should drain and dispatch new fetches
    deferreds[0]!.resolve('value-0');
    await flushMicrotasks();

    // As the walker drains, slots 10..14 should be dispatched
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(11);

    // Resolve everything else so the test completes
    for (let index = 10; index < 15; index += 1) {
      deferreds[index]!.resolve(`value-${index}`);
    }
    await flushMicrotasks();
    await backgroundPromise;
    expect(backgroundError).toBeUndefined();
  });

  it('fires notifier.get(i) when a waiter is present', async () => {
    // Walker reaches slot 0 before fetch resolves → waiter is registered →
    // fetch resolves later → notifier fires → walker proceeds.
    const deferred = createDeferred<string>();
    const fetchOne = (): Promise<string> => deferred.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0], fetchOne, 10),
    );

    // Walker is awaiting the notifier by now
    await flushMicrotasks();

    deferred.resolve('value-0');
    const result = await resultPromise;

    expect(result).toEqual([{ index: 0, task: 0, value: 'value-0' }]);
  });

  it('handles notifier.get(i) being undefined (fetch lands before walker arrives)', async () => {
    // Resolutions that land before the walker gets to them exercise the
    // "no waiter registered" branch in the fetch handler.
    const result = await collect(
      boundedParallelFetchInOrder([0, 1, 2], fetchStringByNumber, 10),
    );

    expect(result.map((r) => r.value)).toEqual([
      'value-0',
      'value-1',
      'value-2',
    ]);
  });

  it('propagates the first fetch rejection as the thrown error', async () => {
    const error = new Error('fetch failed');
    const fetchOne = (task: number): Promise<string> =>
      task === 2 ? Promise.reject(error) : Promise.resolve(`value-${task}`);

    await expect(
      collect(boundedParallelFetchInOrder([0, 1, 2, 3, 4], fetchOne, 10)),
    ).rejects.toBe(error);
  });

  it('keeps the FIRST error when multiple fetches reject', async () => {
    const firstError = new Error('first');
    const secondError = new Error('second');
    const deferreds = Array.from({ length: 3 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) =>
      deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1, 2], fetchOne, 10),
    );

    // Reject slot 1 first, then slot 2
    deferreds[1]!.reject(firstError);
    await flushMicrotasks();
    deferreds[2]!.reject(secondError);
    deferreds[0]!.resolve('value-0');

    await expect(resultPromise).rejects.toBe(firstError);
  });

  it('wakes a waiting walker when an error occurs', async () => {
    // Walker is waiting on slot 0 when slot 1 rejects.
    // The flush-all-notifiers branch must wake the walker so it can throw.
    const error = new Error('kaboom');
    const deferreds = Array.from({ length: 2 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) =>
      deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1], fetchOne, 10),
    );

    await flushMicrotasks();
    // Slot 1 rejects while walker is awaiting slot 0's notifier
    deferreds[1]!.reject(error);

    await expect(resultPromise).rejects.toBe(error);
  });

  it('throws at loop start when error is set before the next iteration begins', async () => {
    // Slot 0 resolves immediately (yielded to caller). Slot 1 rejects while
    // the caller holds the yielded value. When the walker advances to i=1,
    // fatalError is already set → the FIRST guard (before await) throws.
    const error = new Error('pre-iteration');
    const deferred1 = createDeferred<string>();

    const fetchOne = (task: number): Promise<string> => {
      if (task === 1) {
        return deferred1.promise;
      }

      return Promise.resolve(`value-${task}`);
    };

    const gen = boundedParallelFetchInOrder([0, 1], fetchOne, 10);

    // Advance to first yield (slot 0)
    const first = await gen.next();

    expect(first.value).toEqual({ index: 0, task: 0, value: 'value-0' });

    // Reject slot 1 before the walker resumes its loop
    deferred1.reject(error);
    await flushMicrotasks();

    // Walker now checks fatalError at loop start (first guard) and throws
    await expect(gen.next()).rejects.toBe(error);
  });

  it('handles concurrency === 1 (serial degenerate case)', async () => {
    const order: number[] = [];
    const fetchOne = (task: number): Promise<number> => {
      order.push(task);

      return Promise.resolve(task);
    };

    const result = await collect(
      boundedParallelFetchInOrder([10, 20, 30], fetchOne, 1),
    );

    expect(result.map((r) => r.value)).toEqual([10, 20, 30]);
    expect(order).toEqual([10, 20, 30]);
  });

  it('handles concurrency > tasks.length without dispatching extra fetches', async () => {
    const fetchOne = vi.fn((task: number) => Promise.resolve(task));

    const result = await collect(
      boundedParallelFetchInOrder([1, 2, 3], fetchOne, 10),
    );

    expect(result.map((r) => r.value)).toEqual([1, 2, 3]);
    expect(fetchOne).toHaveBeenCalledTimes(3);
  });

  it('accepts undefined as a valid Task and undefined as a valid Value', async () => {
    // Regression test: the primitive must not use value-based `=== undefined`
    // guards for its bounds/presence checks, because that would reject valid
    // undefined tasks or undefined fetch results when Task/Value include
    // undefined in their type.
    const tasks: Array<number | undefined> = [undefined, 1, undefined, 2];

    const fetchOne = (task: number | undefined): Promise<string | undefined> =>
      task === undefined
        ? Promise.resolve(undefined)
        : Promise.resolve(`v${task}`);

    const result = await collect(
      boundedParallelFetchInOrder<number | undefined, string | undefined>(
        tasks,
        fetchOne,
        10,
      ),
    );

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.task)).toEqual([undefined, 1, undefined, 2]);
    expect(result.map((r) => r.value)).toEqual([
      undefined,
      'v1',
      undefined,
      'v2',
    ]);
  });
});
