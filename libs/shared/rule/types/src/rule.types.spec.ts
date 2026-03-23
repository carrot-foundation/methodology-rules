import { RuleOutputSchema, RuleOutputStatus } from './rule.types';

describe('RuleOutputSchema', () => {
  const validInput = {
    requestId: 'req-123',
    responseToken: 'token-abc',
    responseUrl: 'https://example.com/callback',
    resultStatus: RuleOutputStatus.PASSED,
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
    for (const status of Object.values(RuleOutputStatus)) {
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
