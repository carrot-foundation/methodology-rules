import {
  RuleInputSchema,
  RuleOutputSchema,
  RuleOutputStatusSchema,
} from './rule.types';

describe('RuleInputSchema', () => {
  const validInput = {
    documentId: 'doc-123',
    documentKeyPrefix: 'prefix/path',
    requestId: 'req-123',
    responseToken: 'token-abc',
    responseUrl: 'https://example.com/callback',
  };

  it('should accept a valid input with required fields', () => {
    const result = RuleInputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it('should accept a valid input with optional fields', () => {
    const result = RuleInputSchema.safeParse({
      ...validInput,
      environment: 'DEVELOPMENT',
      parentDocumentId: 'parent-456',
      ruleName: 'test-rule',
    });

    expect(result.success).toBe(true);
  });

  it('should reject when documentId is missing', () => {
    const result = RuleInputSchema.safeParse({
      documentKeyPrefix: validInput.documentKeyPrefix,
      requestId: validInput.requestId,
      responseToken: validInput.responseToken,
      responseUrl: validInput.responseUrl,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when documentId is empty', () => {
    const result = RuleInputSchema.safeParse({
      ...validInput,
      documentId: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject when documentKeyPrefix is missing', () => {
    const result = RuleInputSchema.safeParse({
      documentId: validInput.documentId,
      requestId: validInput.requestId,
      responseToken: validInput.responseToken,
      responseUrl: validInput.responseUrl,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when documentKeyPrefix is empty', () => {
    const result = RuleInputSchema.safeParse({
      ...validInput,
      documentKeyPrefix: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject when requestId is missing', () => {
    const result = RuleInputSchema.safeParse({
      documentId: validInput.documentId,
      documentKeyPrefix: validInput.documentKeyPrefix,
      responseToken: validInput.responseToken,
      responseUrl: validInput.responseUrl,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when responseToken is missing', () => {
    const result = RuleInputSchema.safeParse({
      documentId: validInput.documentId,
      documentKeyPrefix: validInput.documentKeyPrefix,
      requestId: validInput.requestId,
      responseUrl: validInput.responseUrl,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when responseUrl is not a valid URL', () => {
    const result = RuleInputSchema.safeParse({
      ...validInput,
      responseUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('should reject when environment is an invalid value', () => {
    const result = RuleInputSchema.safeParse({
      ...validInput,
      environment: 'STAGING',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid RuleEnvironment values', () => {
    for (const environment of ['DEVELOPMENT', 'PRODUCTION']) {
      const result = RuleInputSchema.safeParse({
        ...validInput,
        environment,
      });

      expect(result.success).toBe(true);
    }
  });
});

describe('RuleOutputSchema', () => {
  const validInput = {
    requestId: 'req-123',
    responseToken: 'token-abc',
    responseUrl: 'https://example.com/callback',
    resultStatus: 'PASSED',
  };

  it('should accept a valid input with required fields', () => {
    const result = RuleOutputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it('should accept a valid input with optional fields', () => {
    const result = RuleOutputSchema.safeParse({
      ...validInput,
      resultComment: 'All checks passed',
      resultContent: { key: 'value' },
    });

    expect(result.success).toBe(true);
  });

  it('should reject when requestId is missing', () => {
    const result = RuleOutputSchema.safeParse({
      responseToken: validInput.responseToken,
      responseUrl: validInput.responseUrl,
      resultStatus: validInput.resultStatus,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when responseToken is missing', () => {
    const result = RuleOutputSchema.safeParse({
      requestId: validInput.requestId,
      responseUrl: validInput.responseUrl,
      resultStatus: validInput.resultStatus,
    });

    expect(result.success).toBe(false);
  });

  it('should reject when responseUrl is not a valid URL', () => {
    const result = RuleOutputSchema.safeParse({
      ...validInput,
      responseUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('should reject when resultStatus is an invalid value', () => {
    const result = RuleOutputSchema.safeParse({
      ...validInput,
      resultStatus: 'INVALID_STATUS',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid RuleOutputStatus values', () => {
    for (const status of RuleOutputStatusSchema.options) {
      const result = RuleOutputSchema.safeParse({
        ...validInput,
        resultStatus: status,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should reject when resultStatus is missing', () => {
    const result = RuleOutputSchema.safeParse({
      requestId: validInput.requestId,
      responseToken: validInput.responseToken,
      responseUrl: validInput.responseUrl,
    });

    expect(result.success).toBe(false);
  });
});
