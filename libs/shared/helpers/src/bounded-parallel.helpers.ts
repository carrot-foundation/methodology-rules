export const DEFAULT_FETCH_CONCURRENCY = 10;

/**
 * Fetch a list of tasks in parallel with a bounded concurrency cap, yielding
 * results in the original input order.
 *
 * Memory invariant: at any moment, the number of tasks whose values are held
 * (in-flight fetches + resolved-but-not-yet-yielded values) is at most
 * `concurrency`. Each value is released as soon as the caller consumes its
 * yield, and a new fetch is dispatched to refill the pipeline.
 *
 * Error semantics: on the first rejection, the generator throws that error on
 * its next iteration. Already-in-flight fetches run to completion naturally
 * (no cancellation) but their results are discarded. Subsequent errors are
 * swallowed in favor of the first.
 */
export async function* boundedParallelFetchInOrder<Task, Value>(
  tasks: readonly Task[],
  fetchOne: (task: Task, index: number) => Promise<Value>,
  concurrency: number,
): AsyncGenerator<{ index: number; task: Task; value: Value }> {
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
      const value = await fetchOne(tasks[taskIndex]!, taskIndex);

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

    const value = fetched.get(index) as Value;

    fetched.delete(index);
    dispatch();

    yield { index, task, value };
  }
}
