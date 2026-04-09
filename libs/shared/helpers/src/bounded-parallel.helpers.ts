export const DEFAULT_FETCH_CONCURRENCY = 10;

/**
 * Fetch a list of tasks in parallel with a bounded concurrency cap, yielding
 * results in the original input order even when fetches resolve out of order.
 *
 * Memory invariant: at any moment, the number of pending slots — in-flight
 * fetches plus resolved values buffered for later consumption — is capped at
 * `concurrency`. The consumer consuming a yield releases exactly one slot,
 * which the primitive immediately refills by dispatching the next pending
 * task. No `fetchPromises` array pattern (which retains all resolved values
 * until the array is dropped).
 *
 * Order preservation: results are yielded by input index, not by resolution
 * order. If task N resolves before task N-1, the N-value is buffered until
 * N-1 lands, then both yield in order. Callbacks running inside the for-await
 * loop are therefore invoked in the same order a serial implementation would.
 *
 * Error semantics: on the first rejection, any consumer awaiting the next
 * yield is woken immediately and the generator rethrows. No further tasks
 * are dispatched after the failure. Already-in-flight fetches run to
 * completion (their results and errors are discarded). Subsequent errors
 * are ignored in favor of the first.
 */
export async function* boundedParallelFetchInOrder<Task, Value>(
  tasks: readonly Task[],
  fetchOne: (task: Task, index: number) => Promise<Value>,
  concurrency: number,
): AsyncGenerator<Readonly<{ index: number; task: Task; value: Value }>> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(
      `boundedParallelFetchInOrder: concurrency must be a positive integer, received ${concurrency}`,
    );
  }

  const fetched = new Map<number, Value>();
  const notifiers = new Map<number, () => void>();
  let nextDispatch = 0;
  let inFlightCount = 0;
  let fatalError: undefined | { error: unknown };

  // Indirection prevents TypeScript from narrowing `fatalError` to `never`
  // after a throw-guarded check earlier in the same loop body.
  const getError = (): undefined | { error: unknown } => fatalError;

  const notifyWaiter = (taskIndex: number): void => {
    const notify = notifiers.get(taskIndex);

    if (notify !== undefined) {
      notifiers.delete(taskIndex);
      notify();
    }
  };

  const notifyAllWaiters = (): void => {
    for (const notify of notifiers.values()) {
      notify();
    }
    notifiers.clear();
  };

  const fetchAndSettle = async (taskIndex: number): Promise<void> => {
    try {
      const task = tasks[taskIndex];

      /* v8 ignore start -- invariant: taskIndex always < tasks.length when dispatched */
      if (task === undefined) {
        throw new Error(
          `boundedParallelFetchInOrder invariant violation: tasks[${taskIndex}] is undefined`,
        );
      }
      /* v8 ignore stop */

      const value = await fetchOne(task, taskIndex);

      inFlightCount -= 1;
      fetched.set(taskIndex, value);
      notifyWaiter(taskIndex);
    } catch (error: unknown) {
      inFlightCount -= 1;

      if (fatalError === undefined) {
        fatalError = { error };
      }

      notifyAllWaiters();
    }
  };

  const dispatch = (): void => {
    while (
      fatalError === undefined &&
      inFlightCount + fetched.size < concurrency &&
      nextDispatch < tasks.length
    ) {
      const taskIndex = nextDispatch;

      nextDispatch += 1;
      inFlightCount += 1;

      void fetchAndSettle(taskIndex);
    }
  };

  dispatch();

  for (const [index, task] of tasks.entries()) {
    // Error captured before this iteration — throw without waiting.
    if (fatalError !== undefined) {
      throw fatalError.error;
    }

    if (!fetched.has(index)) {
      await new Promise<void>((resolve) => {
        notifiers.set(index, resolve);
      });
    }

    // fatalError may have been set while we were awaiting the notifier above.
    // getError() defeats TypeScript's narrowing of the outer `let` variable.
    const errorAfterAwait = getError();

    if (errorAfterAwait !== undefined) {
      throw errorAfterAwait.error;
    }

    const value = fetched.get(index);

    /* v8 ignore start -- invariant: fetched always has `index` after notifier fires */
    if (value === undefined) {
      throw new Error(
        `boundedParallelFetchInOrder invariant violation: fetched[${index}] is undefined after await`,
      );
    }
    /* v8 ignore stop */

    fetched.delete(index);
    dispatch();

    yield { index, task, value };
  }
}
