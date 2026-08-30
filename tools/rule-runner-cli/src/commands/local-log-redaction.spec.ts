import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { logger } from '@carrot-fndn/shared/helpers';
import { symbols } from 'pino';

import type { DryRunOptions } from './dry-run.command';

import { loadProcessor } from '../utils/processor-loader';
import { prepareLocalRule } from '../utils/smaug-client';
import { executeRule, processLocalDryRunDocument } from './dry-run.handler';

vi.unmock('pino');

vi.mock('../utils/smaug-client', () => ({
  prepareDryRun: vi.fn(),
  prepareLocalRule: vi.fn(),
}));

vi.mock('../utils/processor-loader', () => ({
  loadLocalRuleModule: vi.fn(),
  loadProcessor: vi.fn(),
}));

vi.mock('../utils/rule-input.builder', async () => {
  const { stubRuleInput } = await import('@carrot-fndn/shared/testing');

  return {
    buildRuleInput: vi.fn().mockReturnValue(stubRuleInput()),
  };
});

const mockPrepareLocalRule = prepareLocalRule as vi.MockedFunction<
  typeof prepareLocalRule
>;
const mockLoadProcessor = loadProcessor as vi.MockedFunction<
  typeof loadProcessor
>;

const options: DryRunOptions = {
  allRules: false,
  cache: false,
  concurrency: 5,
  debug: false,
  documentId: 'document-123',
  json: false,
  methodologySlug: 'bold-carbon-organic',
  rulesScope: 'MassID',
  smaugUrl: 'https://smaug.carrot.eco',
};

const ruleOutput: RuleOutput = {
  requestId: 'test-request-id',
  responseToken: 'cli-placeholder-token',
  responseUrl: 'https://localhost/placeholder',
  resultStatus: 'PASSED',
};

const createContext = (
  Processor: new () => { process: () => Promise<RuleOutput> },
): Parameters<typeof processLocalDryRunDocument>[1] => ({
  localRuleModule: {
    Processor: Processor as never,
    ruleDefinition: {
      description: 'Root-only rule',
      events: [],
      name: 'Root-only rule',
      slug: 'root-only-rule',
      version: '1.0.0',
    },
    rulesScope: 'MassID' as const,
  },
  options,
  selection: {
    dataSetName: 'TEST' as const,
    mode: 'local' as const,
    processorPath: 'some/path',
  },
  smaugUrl: 'https://smaug.carrot.eco',
});

const getPinoOutputStream = (): { write: (value: string) => boolean } =>
  (
    logger as typeof logger & {
      [symbols.streamSym]: { write: (value: string) => boolean };
    }
  )[symbols.streamSym];

describe('local processor structured log redaction', () => {
  beforeEach(() => {
    mockPrepareLocalRule.mockResolvedValue({
      auditDocumentId: 'audit-123',
      auditedDocumentId: 'document-123',
      executionId: 'dry-run/local-exec-1',
    });
  });

  it('should redact processor-internal output to the Pino sink', async () => {
    const sensitiveMarker = 'Fictional participant: Example Recycler';
    const events: string[] = [];

    class Processor {
      process(): Promise<RuleOutput> {
        logger.info(
          {
            cause: new Error(sensitiveMarker),
            participantName: sensitiveMarker,
          },
          'processor details: %s',
          sensitiveMarker,
        );
        events.push('processor-finished');

        return Promise.resolve(ruleOutput);
      }
    }

    const outputSpy = vi
      .spyOn(getPinoOutputStream(), 'write')
      .mockImplementation(() => true);

    vi.spyOn(process.stdout, 'write').mockImplementation(() => {
      events.push('stdout');

      return true;
    });

    await processLocalDryRunDocument('document-123', createContext(Processor));

    expect(JSON.stringify(outputSpy.mock.calls)).not.toContain(sensitiveMarker);
    expect(JSON.stringify(outputSpy.mock.calls)).toContain(
      'LOCAL_PROCESSOR_LOG_REDACTED',
    );
    expect(events).toEqual(['processor-finished', 'stdout']);
  });

  it('should redact and sanitize a local processor constructor failure', async () => {
    const sensitiveMarker = 'Fictional participant: Example Recycler';

    class Processor {
      constructor() {
        logger.error(sensitiveMarker);

        throw new Error(sensitiveMarker);
      }

      process(): Promise<RuleOutput> {
        return Promise.resolve(ruleOutput);
      }
    }

    const outputSpy = vi
      .spyOn(getPinoOutputStream(), 'write')
      .mockImplementation(() => true);

    await expect(
      processLocalDryRunDocument('document-123', createContext(Processor)),
    ).rejects.toThrow('LOCAL_RULE_EXECUTION_FAILED');

    expect(JSON.stringify(outputSpy.mock.calls)).not.toContain(sensitiveMarker);
    expect(JSON.stringify(outputSpy.mock.calls)).toContain(
      'LOCAL_PROCESSOR_LOG_REDACTED',
    );
  });

  it('should preserve later logs after a redacted local processor failure', async () => {
    const sensitiveMarker = 'Fictional participant: Example Recycler';
    const laterMarker = 'safe log after local failure';

    class Processor {
      process(): Promise<RuleOutput> {
        logger.error(sensitiveMarker);

        return Promise.reject(new Error(sensitiveMarker));
      }
    }

    const outputSpy = vi
      .spyOn(getPinoOutputStream(), 'write')
      .mockImplementation(() => true);

    await expect(
      processLocalDryRunDocument('document-123', createContext(Processor)),
    ).rejects.toThrow('LOCAL_RULE_EXECUTION_FAILED');
    logger.info(laterMarker);

    expect(JSON.stringify(outputSpy.mock.calls)).not.toContain(sensitiveMarker);
    expect(JSON.stringify(outputSpy.mock.calls)).toContain(
      'LOCAL_PROCESSOR_LOG_REDACTED',
    );
    expect(JSON.stringify(outputSpy.mock.calls)).toContain(laterMarker);
  });

  it('should redact overlapping local processors without changing unrelated logs', async () => {
    const firstSensitiveMarker = 'Fictional participant: Example Recycler';
    const secondSensitiveMarker = 'Fictional participant: Example Generator';
    const unrelatedMarker = 'safe log outside local processor context';
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondPending = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const processorProcess = vi
      .fn()
      .mockImplementationOnce(async () => {
        logger.info(firstSensitiveMarker);
        await firstPending;
        logger.info(firstSensitiveMarker);

        return ruleOutput;
      })
      .mockImplementationOnce(async () => {
        logger.info(secondSensitiveMarker);
        await secondPending;
        logger.info(secondSensitiveMarker);

        return ruleOutput;
      });

    class Processor {
      process(): Promise<RuleOutput> {
        return processorProcess();
      }
    }

    const context = createContext(Processor);
    const outputSpy = vi
      .spyOn(getPinoOutputStream(), 'write')
      .mockImplementation(() => true);

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const firstExecution = processLocalDryRunDocument('document-1', context);
    const secondExecution = processLocalDryRunDocument('document-2', context);

    await vi.waitFor(() => expect(processorProcess).toHaveBeenCalledTimes(2));
    logger.info(unrelatedMarker);

    releaseFirst?.();
    await firstExecution;

    releaseSecond?.();
    await secondExecution;

    const output = JSON.stringify(outputSpy.mock.calls);

    expect(output).not.toContain(firstSensitiveMarker);
    expect(output).not.toContain(secondSensitiveMarker);
    expect(output).toContain('LOCAL_PROCESSOR_LOG_REDACTED');
    expect(output).toContain(unrelatedMarker);
  });

  it('should preserve processor-internal Pino output in registered mode', async () => {
    const marker = 'registered processor output';

    mockLoadProcessor.mockResolvedValue({
      process: vi.fn().mockImplementation(() => {
        logger.info(marker);

        return Promise.resolve(ruleOutput);
      }),
    } as never);

    const outputSpy = vi
      .spyOn(getPinoOutputStream(), 'write')
      .mockImplementation(() => true);

    await executeRule(
      { ruleName: 'Registered rule', ruleSlug: 'registered-rule' },
      'some/path',
      {
        auditDocumentId: 'audit-123',
        auditedDocumentId: 'document-123',
        executionId: 'dry-run/registered-exec-1',
        rules: [],
      },
      'dry-run/registered-exec-1/documents',
      undefined,
      options,
    );

    expect(JSON.stringify(outputSpy.mock.calls)).toContain(marker);
  });
});
