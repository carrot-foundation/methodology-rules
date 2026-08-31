import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { handleCommandError } from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { Command } from '@commander-js/extra-typings';

import type { DryRunOptions } from './dry-run.command';

import { STUB_ENV_SMAUG_URL, STUB_SMAUG_URL } from '../test.constants';
import { loadLocalRuleModule, loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';
import { prepareDryRun, prepareLocalRule } from '../utils/smaug-client';
import { createDryRunSelection } from './dry-run.command';
import {
  handleDryRun,
  hasDryRunRuleFailure,
  processLocalDryRunDocument,
  resolveDryRunEnvironment,
  resolveProcessorPath,
} from './dry-run.handler';

describe('hasDryRunRuleFailure', () => {
  it.each([
    { expected: true, statuses: ['failed'] as const },
    { expected: true, statuses: ['error'] as const },
    { expected: false, statuses: ['passed'] as const },
    { expected: false, statuses: ['review_required'] as const },
    { expected: true, statuses: ['passed', 'failed'] as const },
  ])('should return $expected for $statuses', ({ expected, statuses }) => {
    expect(
      hasDryRunRuleFailure(
        statuses.map((status) => ({
          ruleSlug: 'local-rule',
          status,
        })),
      ),
    ).toBe(expected);
  });
});

vi.mock('../utils/smaug-client', () => ({
  prepareDryRun: vi.fn(),
  prepareLocalRule: vi.fn(),
}));

vi.mock('../utils/processor-loader', () => ({
  loadLocalRuleModule: vi.fn(),
  loadProcessor: vi.fn(),
}));

vi.mock('../utils/rule-input.builder', () => ({
  buildRuleInput: vi.fn().mockReturnValue({
    documentId: 'audit-123',
    documentKeyPrefix: 'dry-run/exec-1/documents',
    parentDocumentId: 'mass-id-456',
    requestId: 'test-request-id',
    responseToken: 'cli-placeholder-token',
    responseUrl: 'https://localhost/placeholder',
  }),
}));

const mockPrepareDryRun = prepareDryRun as vi.MockedFunction<
  typeof prepareDryRun
>;
const mockPrepareLocalRule = prepareLocalRule as vi.MockedFunction<
  typeof prepareLocalRule
>;
const mockLoadLocalRuleModule = loadLocalRuleModule as vi.MockedFunction<
  typeof loadLocalRuleModule
>;
const mockLoadProcessor = loadProcessor as vi.MockedFunction<
  typeof loadProcessor
>;
const mockBuildRuleInput = buildRuleInput as vi.MockedFunction<
  typeof buildRuleInput
>;

const baseOptions: DryRunOptions & { documentId: string } = {
  allRules: false,
  cache: false,
  concurrency: 5,
  debug: false,
  documentId: 'mass-id-456',
  json: false,
  methodologySlug: 'bold-carbon-organic',
  rulesScope: 'MassID',
  smaugUrl: STUB_SMAUG_URL,
};

const registeredSelection = {
  allRules: true,
  methodologySlug: 'bold-carbon-organic',
  mode: 'registered' as const,
  rulesScope: 'MassID',
};

const mockPreparedResponse = {
  auditDocumentId: 'audit-123',
  auditedDocumentId: 'mass-id-456',
  executionId: 'dry-run/exec-1',
  rules: [
    {
      executionOrder: 1,
      ruleId: 'rule-1',
      ruleName: 'Document Manifest Data',
      ruleScope: 'MassID',
      ruleSlug: 'document-manifest-data',
    },
    {
      executionOrder: 2,
      ruleId: 'rule-2',
      ruleName: 'Weighing',
      ruleScope: 'MassID',
      ruleSlug: 'weighing',
    },
  ],
};

const mockRuleOutput: RuleOutput = {
  requestId: 'test-request-id',
  responseToken: 'cli-placeholder-token',
  responseUrl: 'https://localhost/placeholder' as RuleOutput['responseUrl'],
  resultComment: 'Test passed',
  resultStatus: 'PASSED',
};

describe('handleDryRun', () => {
  const mockProcess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['AUDIT_URL'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    delete process.env['DEBUG'];

    mockPrepareDryRun.mockResolvedValue(mockPreparedResponse);
    mockPrepareLocalRule.mockResolvedValue({
      auditDocumentId: 'synthetic-audit-123',
      auditedDocumentId: 'mass-id-456',
      executionId: 'dry-run/local-exec-1',
    });
    mockProcess.mockResolvedValue(mockRuleOutput);
    mockLoadProcessor.mockResolvedValue({ process: mockProcess } as never);
  });

  it('should call Smaug prepare API with correct parameters', async () => {
    await handleDryRun(registeredSelection, baseOptions);

    expect(mockPrepareDryRun).toHaveBeenCalledWith(STUB_SMAUG_URL, {
      documentId: 'mass-id-456',
      methodologySlug: 'bold-carbon-organic',
      rulesScope: 'MassID',
    });
  });

  it('should run processor for each returned rule', async () => {
    await handleDryRun(registeredSelection, baseOptions);

    expect(mockLoadProcessor).toHaveBeenCalledTimes(2);
    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it('should resolve processor paths from registered rule metadata', async () => {
    await handleDryRun(registeredSelection, baseOptions);

    expect(mockLoadProcessor).toHaveBeenCalledWith(
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data',
      undefined,
    );
    expect(mockLoadProcessor).toHaveBeenCalledWith(
      'libs/methodologies/bold/rule-processors/mass-id/weighing',
      undefined,
    );
  });

  it('should use the explicit registered processor path without calling the local endpoint', async () => {
    const processorPath =
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data';
    const command = new Command('dry-run');

    command.setOptionValueWithSource(
      'methodologySlug',
      'bold-carbon-organic',
      'cli',
    );

    await handleDryRun(
      createDryRunSelection(processorPath, baseOptions, command),
      baseOptions,
    );

    expect(mockPrepareDryRun).toHaveBeenCalledWith(
      STUB_SMAUG_URL,
      expect.objectContaining({
        methodologySlug: 'bold-carbon-organic',
        ruleSlug: 'document-manifest-data',
      }),
    );
    expect(mockPrepareLocalRule).not.toHaveBeenCalled();
    expect(mockLoadProcessor).toHaveBeenCalledWith(processorPath, undefined);
  });

  it('should skip failed rules and continue with others', async () => {
    mockProcess
      .mockRejectedValueOnce(new Error('First rule failed'))
      .mockResolvedValueOnce(mockRuleOutput);

    const result = await handleDryRun(registeredSelection, baseOptions);

    expect(mockProcess).toHaveBeenCalledTimes(2);
    expect(result.ruleResults).toHaveLength(2);
    expect(result.ruleResults[0]?.status).toBe('error');
    expect(result.ruleResults[1]?.status).toBe('passed');
  });

  it('should return review_required status for REVIEW_REQUIRED rule output', async () => {
    mockProcess.mockResolvedValue({
      ...mockRuleOutput,
      resultStatus: 'REVIEW_REQUIRED',
    });

    const result = await handleDryRun(registeredSelection, baseOptions);

    expect(result.ruleResults[0]?.status).toBe('review_required');
  });

  it('should return failed status for FAILED rule output', async () => {
    mockProcess.mockResolvedValue({
      ...mockRuleOutput,
      resultStatus: 'FAILED',
    });

    const result = await handleDryRun(registeredSelection, baseOptions);

    expect(result.ruleResults[0]?.status).toBe('failed');
  });

  it('should throw when AUDIT_URL is not set and no --smaug-url provided', async () => {
    const options = { ...baseOptions, smaugUrl: undefined };

    await expect(handleDryRun(registeredSelection, options)).rejects.toThrow(
      'Smaug URL not set. Use --smaug-url or set AUDIT_URL env var.',
    );
  });

  it('should fall back to AUDIT_URL env var when --smaug-url not provided', async () => {
    process.env['AUDIT_URL'] = STUB_ENV_SMAUG_URL;

    await handleDryRun(registeredSelection, {
      ...baseOptions,
      smaugUrl: undefined,
    });

    expect(mockPrepareDryRun).toHaveBeenCalledWith(
      STUB_ENV_SMAUG_URL,
      expect.anything(),
    );
  });

  it('should enable textract cache by default', async () => {
    await handleDryRun(registeredSelection, { ...baseOptions, cache: true });

    expect(process.env['TEXTRACT_CACHE_DIR']).toBeDefined();
  });

  it('should pass ruleSlug to prepare API when provided', async () => {
    await handleDryRun(
      { ...registeredSelection, ruleSlug: 'document-manifest-data' },
      baseOptions,
    );

    expect(mockPrepareDryRun).toHaveBeenCalledWith(
      STUB_SMAUG_URL,
      expect.objectContaining({
        ruleSlug: 'document-manifest-data',
      }),
    );
  });

  it('should output as JSON when --json option is set', async () => {
    const infoSpy = vi.spyOn(logger, 'info');

    await handleDryRun(registeredSelection, { ...baseOptions, json: true });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('"resultStatus"'),
    );
  });

  it('should build rule input with correct IDs from prepared response', async () => {
    await handleDryRun(registeredSelection, baseOptions);

    expect(mockBuildRuleInput).toHaveBeenCalledWith({
      documentId: 'audit-123',
      documentKeyPrefix: 'dry-run/exec-1/documents',
      parentDocumentId: 'mass-id-456',
    });
  });

  it('should log error stack when debug is enabled and rule fails', async () => {
    const error = new Error('Debug failure');

    mockProcess
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = vi.spyOn(logger, 'error');

    await handleDryRun(registeredSelection, { ...baseOptions, debug: true });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Debug failure'),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });

  it('should handle non-Error thrown values', async () => {
    mockProcess
      .mockRejectedValueOnce('string-error')
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = vi.spyOn(logger, 'error');

    await handleDryRun(registeredSelection, baseOptions);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('string-error'),
    );
  });

  it('should not log stack when debug is disabled and rule fails', async () => {
    mockProcess
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = vi.spyOn(logger, 'error');

    await handleDryRun(registeredSelection, baseOptions);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failure'));
  });

  it('should log DOCUMENT_BUCKET_NAME when env var is set', async () => {
    process.env['DOCUMENT_BUCKET_NAME'] = 'test-bucket';

    const infoSpy = vi.spyOn(logger, 'info');

    await handleDryRun(registeredSelection, baseOptions);

    expect(infoSpy).toHaveBeenCalledWith('DOCUMENT_BUCKET_NAME=test-bucket');

    delete process.env['DOCUMENT_BUCKET_NAME'];
  });

  it('should handle error with undefined stack in debug mode', async () => {
    const error = new Error('No stack');

    Object.defineProperty(error, 'stack', { value: undefined });
    mockProcess
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = vi.spyOn(logger, 'error');

    await handleDryRun(registeredSelection, { ...baseOptions, debug: true });

    expect(errorSpy).toHaveBeenCalledWith('');
  });

  it('should prepare and execute an explicit local processor exactly once', async () => {
    const Processor = vi.fn().mockImplementation(function Processor() {
      return {
        process: mockProcess,
      };
    });
    const ruleInput = {
      parentDocument: {
        relatedDocuments: [{ category: 'WASTE' }],
      },
    };

    mockLoadLocalRuleModule.mockResolvedValue({
      Processor,
      ruleDefinition: {
        description: 'Local rule',
        events: [],
        input: ruleInput,
        name: 'Local rule',
        slug: 'local-rule',
        version: '1.0.0',
      },
      rulesScope: 'MassID',
    } as never);

    await handleDryRun(
      {
        dataSetName: 'TEST',
        mode: 'local',
        processorPath: 'some/path',
      },
      baseOptions,
    );

    expect(mockPrepareLocalRule).toHaveBeenCalledWith(STUB_SMAUG_URL, {
      dataSetName: 'TEST',
      documentId: 'mass-id-456',
      input: ruleInput,
      ruleSlug: 'local-rule',
      rulesScope: 'MassID',
    });
    expect(mockPrepareDryRun).not.toHaveBeenCalled();
    expect(mockBuildRuleInput).toHaveBeenCalledWith({
      prepared: {
        auditDocumentId: 'synthetic-audit-123',
        auditedDocumentId: 'mass-id-456',
        executionId: 'dry-run/local-exec-1',
      },
    });
    expect(Processor).toHaveBeenCalledTimes(1);
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });

  it('should reject an explicit local processor exception', async () => {
    const sensitiveMarker = 'Fictional participant: Example Recycler';
    const Processor = vi.fn().mockImplementation(function Processor() {
      return {
        process: vi.fn().mockRejectedValue(new Error(sensitiveMarker)),
      };
    });

    mockLoadLocalRuleModule.mockResolvedValue({
      Processor,
      ruleDefinition: {
        description: 'Root-only rule',
        events: [],
        input: {},
        name: 'Root-only rule',
        slug: 'root-only-rule',
        version: '1.0.0',
      },
      rulesScope: 'MassID',
    } as never);

    let commandError: unknown;

    try {
      await handleDryRun(
        {
          dataSetName: 'TEST',
          mode: 'local',
          processorPath: 'some/path',
        },
        baseOptions,
      );
    } catch (error: unknown) {
      commandError = error;
    }

    expect(commandError).toEqual(new Error('LOCAL_RULE_EXECUTION_FAILED'));

    const errorSpy = vi.spyOn(logger, 'error');

    handleCommandError(commandError, { verbose: true });

    expect(JSON.stringify(errorSpy.mock.calls)).toContain(
      'LOCAL_RULE_EXECUTION_FAILED',
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(sensitiveMarker);
  });

  it('should forward explicit empty input for a root-only local processor', async () => {
    const Processor = vi.fn().mockImplementation(function Processor() {
      return { process: mockProcess };
    });

    mockLoadLocalRuleModule.mockResolvedValue({
      Processor,
      ruleDefinition: {
        description: 'Root-only rule',
        events: [],
        input: {},
        name: 'Root-only rule',
        slug: 'root-only-rule',
        version: '1.0.0',
      },
      rulesScope: 'MassID',
    } as never);

    await handleDryRun(
      {
        dataSetName: 'TEST',
        mode: 'local',
        processorPath: 'some/path',
      },
      baseOptions,
    );

    expect(mockPrepareLocalRule).toHaveBeenCalledWith(STUB_SMAUG_URL, {
      dataSetName: 'TEST',
      documentId: 'mass-id-456',
      input: {},
      ruleSlug: 'root-only-rule',
      rulesScope: 'MassID',
    });
  });

  it('should construct a fresh local processor for each batch document call', async () => {
    const Processor = vi.fn().mockImplementation(function Processor() {
      return { process: mockProcess };
    });
    const context = {
      localRuleModule: {
        Processor,
        ruleDefinition: {
          description: 'Root-only rule',
          events: [],
          input: {},
          name: 'Root-only rule',
          slug: 'root-only-rule',
          version: '1.0.0',
        },
        rulesScope: 'MassID' as const,
      },
      options: baseOptions,
      selection: {
        dataSetName: 'TEST' as const,
        mode: 'local' as const,
        processorPath: 'some/path',
      },
      smaugUrl: STUB_SMAUG_URL,
    };

    await processLocalDryRunDocument('document-1', context);
    await processLocalDryRunDocument('document-2', context);

    expect(Processor).toHaveBeenCalledTimes(2);
    expect(Processor.mock.results[0]?.value).not.toBe(
      Processor.mock.results[1]?.value,
    );
  });

  it('should not build input or construct a processor when local preparation rejects', async () => {
    const Processor = vi.fn();

    mockPrepareLocalRule.mockRejectedValue(
      new Error('Smaug local rule preparation response is invalid'),
    );
    mockLoadLocalRuleModule.mockResolvedValue({
      Processor,
      ruleDefinition: {
        description: 'Root-only rule',
        events: [],
        input: {},
        name: 'Root-only rule',
        slug: 'root-only-rule',
        version: '1.0.0',
      },
      rulesScope: 'MassID',
    } as never);

    await expect(
      handleDryRun(
        {
          dataSetName: 'TEST',
          mode: 'local',
          processorPath: 'some/path',
        },
        baseOptions,
      ),
    ).rejects.toThrow('Smaug local rule preparation response is invalid');

    expect(mockBuildRuleInput).not.toHaveBeenCalled();
    expect(Processor).not.toHaveBeenCalled();
  });

  it('should output a local processor result as JSON when requested', async () => {
    const Processor = vi.fn().mockImplementation(function Processor() {
      return { process: mockProcess };
    });

    mockLoadLocalRuleModule.mockResolvedValue({
      Processor,
      ruleDefinition: {
        description: 'Root-only rule',
        events: [],
        input: {},
        name: 'Root-only rule',
        slug: 'root-only-rule',
        version: '1.0.0',
      },
      rulesScope: 'MassID',
    } as never);

    mockProcess.mockResolvedValue({
      ...mockRuleOutput,
      resultComment: 'Fictional participant: Example Recycler',
    });
    const infoSpy = vi.spyOn(logger, 'info');
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    await handleDryRun(
      {
        dataSetName: 'TEST',
        mode: 'local',
        processorPath: 'some/path',
      },
      { ...baseOptions, json: true },
    );

    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('"resultStatus"'),
    );
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('Example Recycler'),
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      'Example Recycler',
    );
  });

  it('should suppress local processor output when requested', async () => {
    const Processor = vi.fn().mockImplementation(function Processor() {
      return { process: mockProcess };
    });
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    await processLocalDryRunDocument('document-1', {
      localRuleModule: {
        Processor,
        ruleDefinition: {
          description: 'Root-only rule',
          events: [],
          input: {},
          name: 'Root-only rule',
          slug: 'root-only-rule',
          version: '1.0.0',
        },
        rulesScope: 'MassID',
      } as never,
      options: { ...baseOptions, json: true },
      selection: {
        dataSetName: 'TEST',
        mode: 'local',
        processorPath: 'some/path',
      },
      smaugUrl: STUB_SMAUG_URL,
      writeOutput: false,
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});

describe('resolveDryRunEnv', () => {
  beforeEach(() => {
    delete process.env['AUDIT_URL'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    delete process.env['DEBUG'];
  });

  it('should return smaugUrl from options', () => {
    const result = resolveDryRunEnvironment({
      cache: false,
      debug: false,
      smaugUrl: STUB_SMAUG_URL,
    });

    expect(result).toStrictEqual({ smaugUrl: STUB_SMAUG_URL });
  });

  it('should fall back to AUDIT_URL env var', () => {
    process.env['AUDIT_URL'] = STUB_ENV_SMAUG_URL;

    const result = resolveDryRunEnvironment({
      cache: false,
      debug: false,
      smaugUrl: undefined,
    });

    expect(result).toStrictEqual({ smaugUrl: STUB_ENV_SMAUG_URL });
  });

  it('should throw when no smaug URL is available', () => {
    expect(() =>
      resolveDryRunEnvironment({
        cache: false,
        debug: false,
        smaugUrl: undefined,
      }),
    ).toThrow('Smaug URL not set. Use --smaug-url or set AUDIT_URL env var.');
  });

  it('should set TEXTRACT_CACHE_DIR when cache is enabled', () => {
    resolveDryRunEnvironment({
      cache: true,
      debug: false,
      smaugUrl: STUB_SMAUG_URL,
    });

    expect(process.env['TEXTRACT_CACHE_DIR']).toBeDefined();
  });

  it('should set DEBUG env var when debug is enabled', () => {
    resolveDryRunEnvironment({
      cache: false,
      debug: true,
      smaugUrl: STUB_SMAUG_URL,
    });

    expect(process.env['DEBUG']).toBe('true');
  });
});

describe('resolveProcessorPath', () => {
  it('should resolve path for simple scope', () => {
    expect(
      resolveProcessorPath({ ruleScope: 'MassID', ruleSlug: 'my-rule' }),
    ).toBe('libs/methodologies/bold/rule-processors/mass-id/my-rule');
  });

  it('should handle camelCase scope names', () => {
    expect(
      resolveProcessorPath({
        ruleScope: 'CreditOrder',
        ruleSlug: 'some-rule',
      }),
    ).toBe('libs/methodologies/bold/rule-processors/credit-order/some-rule');
  });

  it('should handle spaces in scope names', () => {
    expect(
      resolveProcessorPath({
        ruleScope: 'Credit Order',
        ruleSlug: 'some-rule',
      }),
    ).toBe('libs/methodologies/bold/rule-processors/credit-order/some-rule');
  });
});
