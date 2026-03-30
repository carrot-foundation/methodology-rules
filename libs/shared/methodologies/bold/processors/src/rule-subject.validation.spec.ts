import { logger } from '@carrot-fndn/shared/helpers';
import { z } from 'zod';

import { BaseProcessorErrors } from './base-processor.errors';
import { validateRuleSubjectOrThrow } from './rule-subject.validation';

class TestProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to process request',
    INVALID_RULE_SUBJECT: 'The rule subject is invalid.',
  };
}

describe('validateRuleSubjectOrThrow', () => {
  const schema = z.object({ type: z.literal('Organic') });
  const errors = new TestProcessorErrors();

  it('should return typed data when validation succeeds', () => {
    const result = validateRuleSubjectOrThrow({
      errors,
      input: { type: 'Organic' },
      schema,
      validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
    });

    expect(result).toEqual({ type: 'Organic' });
  });

  it('should throw a known processor error with ZodError cause when validation fails', () => {
    let thrownError: Error | undefined;

    try {
      validateRuleSubjectOrThrow({
        errors,
        input: { type: 'Unknown' },
        schema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError!.message).toContain('The rule subject is invalid.');
    expect(thrownError!.cause).toBeInstanceOf(z.ZodError);
  });

  it('should log validation issues on failure', () => {
    const loggerErrorSpy = vi.spyOn(logger, 'error');

    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: { type: 'Invalid' },
        schema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow();

    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('should use first issue message when it is a custom message', () => {
    const schemaWithCustomMessage = z.object({
      items: z.array(z.string()).superRefine((items, context) => {
        if (items.length === 0) {
          context.addIssue('Custom: no items found.');
        }
      }),
    });

    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: { items: [] },
        schema: schemaWithCustomMessage,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow('Custom: no items found.');
  });

  it('should fall back to validationMessage when first issue is generic', () => {
    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: {},
        schema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow('The rule subject is invalid.');
  });

  it('should fall back to validationMessage when issue message is undefined', () => {
    const alwaysFailSchema = z.object({}).superRefine((_data, context) => {
      context.addIssue({ code: 'custom' } as never);
    });

    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: {},
        schema: alwaysFailSchema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow('The rule subject is invalid.');
  });
});
