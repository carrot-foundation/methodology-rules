import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { logger } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import type { DryRunOptions } from './dry-run.command';

import { loadProcessor } from '../utils/processor-loader';
import { buildRuleInput } from '../utils/rule-input.builder';
import { prepareDryRun } from '../utils/smaug-client';
import { handleDryRun } from './dry-run.handler';

jest.mock('../utils/smaug-client', () => ({
  prepareDryRun: jest.fn(),
}));

jest.mock('../utils/processor-loader', () => ({
  loadProcessor: jest.fn(),
}));

jest.mock('../utils/rule-input.builder', () => ({
  buildRuleInput: jest.fn().mockReturnValue({
    documentId: 'audit-123',
    documentKeyPrefix: 'dry-run/exec-1/documents',
    parentDocumentId: 'mass-id-456',
    requestId: 'test-request-id',
    responseToken: 'cli-placeholder-token',
    responseUrl: 'https://localhost/placeholder',
  }),
}));

const mockPrepareDryRun = prepareDryRun as jest.MockedFunction<
  typeof prepareDryRun
>;
const mockLoadProcessor = loadProcessor as jest.MockedFunction<
  typeof loadProcessor
>;
const mockBuildRuleInput = buildRuleInput as jest.MockedFunction<
  typeof buildRuleInput
>;

const baseOptions: DryRunOptions = {
  allRules: false,
  cache: false,
  debug: false,
  documentId: 'mass-id-456',
  json: false,
  methodologySlug: 'bold-carbon-organic',
  rulesScope: 'MassID',
  smaugUrl: 'https://smaug.carrot.eco',
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
      ruleName: 'Project Boundary',
      ruleScope: 'MassID',
      ruleSlug: 'project-boundary',
    },
  ],
};

const mockRuleOutput: RuleOutput = {
  requestId: 'test-request-id',
  responseToken: 'cli-placeholder-token',
  responseUrl: 'https://localhost/placeholder' as RuleOutput['responseUrl'],
  resultComment: 'Test passed',
  resultStatus: RuleOutputStatus.PASSED,
};

describe('handleDryRun', () => {
  const mockProcess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['AUDIT_URL'];
    delete process.env['TEXTRACT_CACHE_DIR'];
    delete process.env['DEBUG'];

    mockPrepareDryRun.mockResolvedValue(mockPreparedResponse);
    mockProcess.mockResolvedValue(mockRuleOutput);
    mockLoadProcessor.mockResolvedValue({ process: mockProcess } as never);
  });

  it('should call Smaug prepare API with correct parameters', async () => {
    await handleDryRun(
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data',
      baseOptions,
    );

    expect(mockPrepareDryRun).toHaveBeenCalledWith('https://smaug.carrot.eco', {
      documentId: 'mass-id-456',
      methodologySlug: 'bold-carbon-organic',
      rulesScope: 'MassID',
    });
  });

  it('should run processor for each returned rule', async () => {
    await handleDryRun(
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data',
      baseOptions,
    );

    expect(mockLoadProcessor).toHaveBeenCalledTimes(2);
    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it('should use provided processorPath when given', async () => {
    const processorPath =
      'libs/methodologies/bold/rule-processors/mass-id/custom-rule';

    await handleDryRun(processorPath, baseOptions);

    expect(mockLoadProcessor).toHaveBeenCalledWith(processorPath, undefined);
  });

  it('should resolve processor path from rule metadata when no processorPath given', async () => {
    await handleDryRun(undefined, { ...baseOptions, allRules: true });

    expect(mockLoadProcessor).toHaveBeenCalledWith(
      'libs/methodologies/bold/rule-processors/mass-id/document-manifest-data',
      undefined,
    );
    expect(mockLoadProcessor).toHaveBeenCalledWith(
      'libs/methodologies/bold/rule-processors/mass-id/project-boundary',
      undefined,
    );
  });

  it('should skip failed rules and continue with others', async () => {
    mockProcess
      .mockRejectedValueOnce(new Error('First rule failed'))
      .mockResolvedValueOnce(mockRuleOutput);

    await handleDryRun('some/path', baseOptions);

    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it('should throw when AUDIT_URL is not set and no --smaug-url provided', async () => {
    const options = { ...baseOptions, smaugUrl: undefined };

    await expect(handleDryRun('some/path', options)).rejects.toThrow(
      'Smaug URL not set. Use --smaug-url or set AUDIT_URL env var.',
    );
  });

  it('should fall back to AUDIT_URL env var when --smaug-url not provided', async () => {
    process.env['AUDIT_URL'] = 'https://smaug-from-env.carrot.eco';

    await handleDryRun('some/path', {
      ...baseOptions,
      smaugUrl: undefined,
    });

    expect(mockPrepareDryRun).toHaveBeenCalledWith(
      'https://smaug-from-env.carrot.eco',
      expect.anything(),
    );
  });

  it('should enable textract cache by default', async () => {
    await handleDryRun('some/path', { ...baseOptions, cache: true });

    expect(process.env['TEXTRACT_CACHE_DIR']).toBeDefined();
  });

  it('should pass ruleSlug to prepare API when provided', async () => {
    await handleDryRun('some/path', {
      ...baseOptions,
      ruleSlug: 'document-manifest-data',
    });

    expect(mockPrepareDryRun).toHaveBeenCalledWith(
      'https://smaug.carrot.eco',
      expect.objectContaining({
        ruleSlug: 'document-manifest-data',
      }),
    );
  });

  it('should output as JSON when --json option is set', async () => {
    const infoSpy = jest.spyOn(logger, 'info');

    await handleDryRun('some/path', { ...baseOptions, json: true });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('"resultStatus"'),
    );
  });

  it('should build rule input with correct IDs from prepared response', async () => {
    await handleDryRun('some/path', baseOptions);

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

    const errorSpy = jest.spyOn(logger, 'error');

    await handleDryRun('some/path', { ...baseOptions, debug: true });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Debug failure'),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });

  it('should handle non-Error thrown values', async () => {
    mockProcess
      .mockRejectedValueOnce('string-error')
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = jest.spyOn(logger, 'error');

    await handleDryRun('some/path', baseOptions);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('string-error'),
    );
  });

  it('should not log stack when debug is disabled and rule fails', async () => {
    mockProcess
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = jest.spyOn(logger, 'error');

    await handleDryRun('some/path', baseOptions);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failure'));
  });

  it('should log DOCUMENT_BUCKET_NAME when env var is set', async () => {
    process.env['DOCUMENT_BUCKET_NAME'] = 'test-bucket';

    const infoSpy = jest.spyOn(logger, 'info');

    await handleDryRun('some/path', baseOptions);

    expect(infoSpy).toHaveBeenCalledWith('DOCUMENT_BUCKET_NAME=test-bucket');

    delete process.env['DOCUMENT_BUCKET_NAME'];
  });

  it('should handle error with undefined stack in debug mode', async () => {
    const error = new Error('No stack');

    Object.defineProperty(error, 'stack', { value: undefined });
    mockProcess
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockRuleOutput);

    const errorSpy = jest.spyOn(logger, 'error');

    await handleDryRun('some/path', { ...baseOptions, debug: true });

    expect(errorSpy).toHaveBeenCalledWith('');
  });
});
