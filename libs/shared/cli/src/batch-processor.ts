interface BatchProcessorOptions<TItem, TSuccess> {
  concurrency: number;
  items: TItem[];
  onBatchStart?: (
    batchNumber: number,
    totalBatches: number,
    batchSize: number,
  ) => void;
  onItemFailure?: (item: TItem, error: string) => void;
  onItemSuccess?: (item: TItem, result: TSuccess) => void;
  processItem: (item: TItem) => Promise<TSuccess>;
}

interface BatchResult<TItem, TSuccess> {
  failures: Array<{ error: string; item: TItem }>;
  successes: Array<{ item: TItem; result: TSuccess }>;
}

export const processBatch = async <TItem, TSuccess>(
  options: BatchProcessorOptions<TItem, TSuccess>,
): Promise<BatchResult<TItem, TSuccess>> => {
  const {
    concurrency,
    items,
    onBatchStart,
    onItemFailure,
    onItemSuccess,
    processItem,
  } = options;

  if (concurrency <= 0) {
    throw new Error('concurrency must be greater than 0');
  }

  const successes: BatchResult<TItem, TSuccess>['successes'] = [];
  const failures: BatchResult<TItem, TSuccess>['failures'] = [];

  const totalBatches = Math.ceil(items.length / concurrency);

  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    const batchNumber = Math.floor(index / concurrency) + 1;

    onBatchStart?.(batchNumber, totalBatches, batch.length);

    const settled = await Promise.allSettled(
      batch.map((item) => processItem(item)),
    );

    for (const [entryIndex, result] of settled.entries()) {
      // eslint-disable-next-line security/detect-object-injection
      const item = batch[entryIndex]!;

      if (result.status === 'fulfilled') {
        successes.push({ item, result: result.value });
        onItemSuccess?.(item, result.value);
      } else {
        const error =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

        failures.push({ error, item });
        onItemFailure?.(item, error);
      }
    }
  }

  return { failures, successes };
};

export type { BatchProcessorOptions, BatchResult };
