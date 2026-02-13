import { processBatch } from './batch-processor';

describe('processBatch', () => {
  it('should process all items successfully', async () => {
    const result = await processBatch({
      concurrency: 2,
      items: [1, 2, 3],
      processItem: (item) => Promise.resolve(item * 10),
    });

    expect(result.successes).toEqual([
      { item: 1, result: 10 },
      { item: 2, result: 20 },
      { item: 3, result: 30 },
    ]);
    expect(result.failures).toEqual([]);
  });

  it('should capture failures without stopping the batch', async () => {
    const result = await processBatch({
      concurrency: 3,
      items: ['ok', 'fail', 'ok2'],
      processItem: (item) => {
        if (item === 'fail') {
          return Promise.reject(new Error('boom'));
        }

        return Promise.resolve(`processed-${item}`);
      },
    });

    expect(result.successes).toEqual([
      { item: 'ok', result: 'processed-ok' },
      { item: 'ok2', result: 'processed-ok2' },
    ]);
    expect(result.failures).toEqual([{ error: 'boom', item: 'fail' }]);
  });

  it('should respect concurrency by processing items in batches', async () => {
    const concurrentCounts: number[] = [];
    let currentConcurrent = 0;

    const result = await processBatch({
      concurrency: 2,
      items: [1, 2, 3, 4, 5],
      processItem: async (item) => {
        currentConcurrent++;
        concurrentCounts.push(currentConcurrent);

        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });

        currentConcurrent--;

        return item;
      },
    });

    expect(result.successes).toHaveLength(5);
    expect(Math.max(...concurrentCounts)).toBeLessThanOrEqual(2);
  });

  it('should call onBatchStart for each batch', async () => {
    const batchStarts: Array<{
      batchNumber: number;
      batchSize: number;
      totalBatches: number;
    }> = [];

    await processBatch({
      concurrency: 2,
      items: [1, 2, 3, 4, 5],
      onBatchStart: (batchNumber, totalBatches, batchSize) => {
        batchStarts.push({ batchNumber, batchSize, totalBatches });
      },
      processItem: (item) => Promise.resolve(item),
    });

    expect(batchStarts).toEqual([
      { batchNumber: 1, batchSize: 2, totalBatches: 3 },
      { batchNumber: 2, batchSize: 2, totalBatches: 3 },
      { batchNumber: 3, batchSize: 1, totalBatches: 3 },
    ]);
  });

  it('should call onItemSuccess and onItemFailure callbacks', async () => {
    const successItems: Array<{ item: string; result: string }> = [];
    const failureItems: Array<{ error: string; item: string }> = [];

    await processBatch<string, string>({
      concurrency: 3,
      items: ['a', 'b', 'c'],
      onItemFailure: (item, error) => {
        failureItems.push({ error, item });
      },
      onItemSuccess: (item, result) => {
        successItems.push({ item, result });
      },
      processItem: (item) => {
        if (item === 'b') {
          return Promise.reject(new Error('failed-b'));
        }

        return Promise.resolve(`done-${item}`);
      },
    });

    expect(successItems).toEqual([
      { item: 'a', result: 'done-a' },
      { item: 'c', result: 'done-c' },
    ]);
    expect(failureItems).toEqual([{ error: 'failed-b', item: 'b' }]);
  });

  it('should handle empty items array', async () => {
    const result = await processBatch({
      concurrency: 5,
      items: [] as string[],
      processItem: (item) => Promise.resolve(item),
    });

    expect(result.successes).toEqual([]);
    expect(result.failures).toEqual([]);
  });

  it('should stringify non-Error rejection reasons', async () => {
    const result = await processBatch({
      concurrency: 1,
      items: ['x'],
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors, prefer-promise-reject-errors
      processItem: () => Promise.reject('string-error'),
    });

    expect(result.failures).toEqual([{ error: 'string-error', item: 'x' }]);
  });
});
