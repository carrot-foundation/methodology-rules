import { processBatch } from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { readFile } from 'node:fs/promises';

import type { DryRunOptions } from './dry-run.command';
import type { DryRunDocumentResult } from './dry-run.handler';

import { writeJsonLog } from '../utils/batch-summary';
import { handleDryRunBatch } from './dry-run-batch.handler';
import {
  processDryRunDocument,
  resolveDryRunEnvironment,
} from './dry-run.handler';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('@carrot-fndn/shared/cli', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '@carrot-fndn/shared/cli',
  );

  return {
    ...actual,
    processBatch: jest.fn(),
  };
});

jest.mock('./dry-run.handler', () => ({
  processDryRunDocument: jest.fn(),
  resolveDryRunEnvironment: jest.fn().mockReturnValue({
    smaugUrl: 'https://smaug.carrot.eco',
  }),
}));

jest.mock('../utils/config-parser', () => ({
  parseConfig: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../utils/batch-summary', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '../utils/batch-summary',
  );

  return {
    ...actual,
    writeJsonLog: jest.fn(),
  };
});

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockProcessBatch = processBatch as jest.MockedFunction<
  typeof processBatch
>;
const mockResolveDryRunEnvironment =
  resolveDryRunEnvironment as jest.MockedFunction<
    typeof resolveDryRunEnvironment
  >;
const mockProcessDryRunDocument = processDryRunDocument as jest.MockedFunction<
  typeof processDryRunDocument
>;
const mockWriteJsonLog = writeJsonLog as jest.MockedFunction<
  typeof writeJsonLog
>;

const INPUT_FILE_PATH = 'test-data/docs.json';

const baseOptions: DryRunOptions = {
  allRules: true,
  cache: false,
  concurrency: 5,
  debug: false,
  documentId: 'unused',
  inputFile: INPUT_FILE_PATH,
  json: false,
  methodologySlug: 'bold-carbon-organic',
  rulesScope: 'MassID',
  smaugUrl: 'https://smaug.carrot.eco',
};

const makeDocumentResult = (
  documentId: string,
  rules: Array<{
    resultContent?: Record<string, unknown>;
    status: DryRunDocumentResult['ruleResults'][number]['status'];
  }>,
): DryRunDocumentResult => ({
  documentId,
  ruleResults: rules.map((rule, index) => ({
    resultContent: rule.resultContent,
    ruleSlug: `rule-${String(index + 1)}`,
    status: rule.status,
  })),
});

describe('handleDryRunBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
    mockResolveDryRunEnvironment.mockReturnValue({
      smaugUrl: 'https://smaug.carrot.eco',
    });
    mockProcessBatch.mockResolvedValue({ failures: [], successes: [] });
    mockWriteJsonLog.mockResolvedValue();
  });

  it('should throw when --input-file is not provided', async () => {
    await expect(
      handleDryRunBatch(undefined, { ...baseOptions, inputFile: undefined }),
    ).rejects.toThrow('--input-file is required for batch mode');
  });

  it('should read and parse document IDs from input file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1', 'doc-2', 'doc-3']));
    const result1 = makeDocumentResult('doc-1', [{ status: 'passed' }]);
    const result2 = makeDocumentResult('doc-2', [{ status: 'passed' }]);
    const result3 = makeDocumentResult('doc-3', [{ status: 'passed' }]);

    mockProcessBatch.mockResolvedValue({
      failures: [],
      successes: [
        { item: 'doc-1', result: result1 },
        { item: 'doc-2', result: result2 },
        { item: 'doc-3', result: result3 },
      ],
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(mockReadFile).toHaveBeenCalledWith(INPUT_FILE_PATH, 'utf8');
    expect(mockProcessBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        concurrency: 5,
        items: ['doc-1', 'doc-2', 'doc-3'],
      }),
    );
  });

  it('should call resolveDryRunEnvironment once for setup', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));
    mockProcessBatch.mockResolvedValue({
      failures: [],
      successes: [
        {
          item: 'doc-1',
          result: makeDocumentResult('doc-1', [{ status: 'passed' }]),
        },
      ],
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(mockResolveDryRunEnvironment).toHaveBeenCalledTimes(1);
    expect(mockResolveDryRunEnvironment).toHaveBeenCalledWith(baseOptions);
  });

  it('should pass concurrency from options to processBatch', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));
    mockProcessBatch.mockResolvedValue({
      failures: [],
      successes: [
        {
          item: 'doc-1',
          result: makeDocumentResult('doc-1', [{ status: 'passed' }]),
        },
      ],
    });

    await handleDryRunBatch(undefined, { ...baseOptions, concurrency: 3 });

    expect(mockProcessBatch).toHaveBeenCalledWith(
      expect.objectContaining({ concurrency: 3 }),
    );
  });

  it('should call processDryRunDocument for each item via processItem', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1', 'doc-2']));
    mockProcessDryRunDocument
      .mockResolvedValueOnce(
        makeDocumentResult('doc-1', [{ status: 'passed' }]),
      )
      .mockResolvedValueOnce(
        makeDocumentResult('doc-2', [{ status: 'passed' }]),
      );

    mockProcessBatch.mockImplementation(async (options) => {
      const successes = [];

      for (const item of options.items) {
        const result = await options.processItem(item);

        successes.push({ item, result });
      }

      return { failures: [], successes };
    });

    await handleDryRunBatch('some/path', baseOptions);

    expect(mockProcessDryRunDocument).toHaveBeenCalledTimes(2);
    expect(mockProcessDryRunDocument).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({
        methodologySlug: 'bold-carbon-organic',
        processorPath: 'some/path',
        smaugUrl: 'https://smaug.carrot.eco',
      }),
    );
  });

  it('should aggregate rule statuses across documents in summary', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1', 'doc-2', 'doc-3']));

    const document1Result = makeDocumentResult('doc-1', [
      { status: 'passed' },
      { status: 'passed' },
    ]);
    const document2Result = makeDocumentResult('doc-2', [
      { status: 'passed' },
      { status: 'review_required' },
    ]);
    const document3Result = makeDocumentResult('doc-3', [
      { status: 'failed' },
      { status: 'error' },
    ]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', document1Result);
      options.onItemSuccess?.('doc-2', document2Result);
      options.onItemSuccess?.('doc-3', document3Result);

      return Promise.resolve({
        failures: [],
        successes: [
          { item: 'doc-1', result: document1Result },
          { item: 'doc-2', result: document2Result },
          { item: 'doc-3', result: document3Result },
        ],
      });
    });

    const infoSpy = jest.spyOn(logger, 'info');

    await handleDryRunBatch(undefined, baseOptions);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Total documents: 3'),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Total rules executed: 6'),
    );
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Passed: 3'));
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Review required: 1'),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed (rule): 1'),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rule errors: 1'),
    );
  });

  it('should include reason code breakdowns in summary', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const resultWithReasons = makeDocumentResult('doc-1', [
      {
        resultContent: {
          reviewReasons: [{ code: 'MISSING_DATA' }, { code: 'MISSING_DATA' }],
        },
        status: 'review_required',
      },
      {
        resultContent: {
          failReasons: [{ code: 'INVALID_VALUE' }],
        },
        status: 'failed',
      },
    ]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', resultWithReasons);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: resultWithReasons }],
      });
    });

    const infoSpy = jest.spyOn(logger, 'info');

    await handleDryRunBatch(undefined, baseOptions);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('MISSING_DATA: 2'),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('INVALID_VALUE: 1'),
    );
  });

  it('should write rule-failures file when there are failed rules', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const failedResult = makeDocumentResult('doc-1', [{ status: 'failed' }]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', failedResult);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: failedResult }],
      });
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(mockWriteJsonLog).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'doc-1',
          resultStatus: 'failed',
          ruleSlug: 'rule-1',
        }),
      ]),
      'rule-failures',
    );
  });

  it('should write review-required file when there are review required rules', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const reviewResult = makeDocumentResult('doc-1', [
      { status: 'review_required' },
    ]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', reviewResult);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: reviewResult }],
      });
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(mockWriteJsonLog).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'doc-1',
          resultStatus: 'review_required',
          ruleSlug: 'rule-1',
        }),
      ]),
      'review-required',
    );
  });

  it('should not write result files when all rules pass', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const passedResult = makeDocumentResult('doc-1', [{ status: 'passed' }]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', passedResult);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: passedResult }],
      });
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(mockWriteJsonLog).not.toHaveBeenCalled();
  });

  it('should set exit code 1 when there are document failures', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));
    mockProcessBatch.mockResolvedValue({
      failures: [{ error: 'boom', item: 'doc-1' }],
      successes: [],
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(process.exitCode).toBe(1);
  });

  it('should set exit code 1 when there are rule failures', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const failedResult = makeDocumentResult('doc-1', [{ status: 'failed' }]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', failedResult);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: failedResult }],
      });
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(process.exitCode).toBe(1);
  });

  it('should not set exit code when all rules pass', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));

    const passedResult = makeDocumentResult('doc-1', [
      { status: 'passed' },
      { status: 'passed' },
    ]);

    mockProcessBatch.mockImplementation((options) => {
      options.onItemSuccess?.('doc-1', passedResult);

      return Promise.resolve({
        failures: [],
        successes: [{ item: 'doc-1', result: passedResult }],
      });
    });

    await handleDryRunBatch(undefined, baseOptions);

    expect(process.exitCode).toBeUndefined();
  });

  it('should throw when input file is not a JSON array', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ key: 'value' }));

    await expect(handleDryRunBatch(undefined, baseOptions)).rejects.toThrow(
      'Input file must contain a JSON array',
    );
  });

  it('should throw when input file contains non-string entries', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1', 123]));

    await expect(handleDryRunBatch(undefined, baseOptions)).rejects.toThrow(
      'Entry at index 1 must be a string document ID',
    );
  });

  it('should log batch start via onBatchStart callback', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));
    mockProcessBatch.mockImplementation((options) => {
      options.onBatchStart?.(1, 1, 1);

      return Promise.resolve({ failures: [], successes: [] });
    });

    const infoSpy = jest.spyOn(logger, 'info');

    await handleDryRunBatch(undefined, baseOptions);

    expect(infoSpy).toHaveBeenCalledWith(
      'Processing batch 1/1 (1 documents)...',
    );
  });

  it('should log errors via onItemFailure callback', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(['doc-1']));
    mockProcessBatch.mockImplementation((options) => {
      options.onItemFailure?.('doc-1', 'something broke');

      return Promise.resolve({
        failures: [{ error: 'something broke', item: 'doc-1' }],
        successes: [],
      });
    });

    const errorSpy = jest.spyOn(logger, 'error');

    await handleDryRunBatch(undefined, baseOptions);

    expect(errorSpy).toHaveBeenCalledWith('Error [doc-1]: something broke');
  });
});
