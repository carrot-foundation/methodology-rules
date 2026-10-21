import { logger } from '@carrot-fndn/shared/helpers';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';
import { z } from 'zod';

import { BaseProcessorErrors } from './base-processor.errors';
import { validateRuleSubjectOrThrow } from './rule-subject.validation';

class TestProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to process request',
    INVALID_RULE_SUBJECT: 'The rule subject is invalid.',
  };
}

const captureThrownError = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the callback to throw');
};

describe('validateRuleSubjectOrThrow', () => {
  const schema = z.object({ type: z.literal('Organic') });
  const errors = new TestProcessorErrors();
  const TEST_FINDINGS = defineRuleFindings(
    'test-rule',
    { ERROR: errors.ERROR_MESSAGE },
    {
      'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
      'ERROR.INVALID_RULE_SUBJECT': { defaultOwner: 'INTEGRATOR' },
    },
  );
  const validationFinding = TEST_FINDINGS.render('ERROR.INVALID_RULE_SUBJECT');

  it('should return typed data when validation succeeds', () => {
    const result = validateRuleSubjectOrThrow({
      errors,
      input: { type: 'Organic' },
      schema,
      validationFinding,
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
        validationFinding,
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
        validationFinding,
      }),
    ).toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        validationMessage: 'The rule subject is invalid.',
      }),
      'Invalid rule subject',
    );
  });

  it('should use first issue message when it is a custom message', () => {
    const schemaWithCustomMessage = z.object({
      items: z.array(z.string()).superRefine((items, context) => {
        if (items.length === 0) {
          context.addIssue('Custom: no items found.');
        }
      }),
    });

    const thrownError = captureThrownError(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: { items: [] },
        schema: schemaWithCustomMessage,
        validationFinding,
      }),
    );

    expect(errors.getFailedResultFromError(thrownError)).toEqual({
      resultComment: 'Custom: no items found.',
      resultFindings: [validationFinding.finding],
    });
  });

  it('should fall back to the validationFinding message when first issue is generic', () => {
    const thrownError = captureThrownError(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: {},
        schema,
        validationFinding,
      }),
    );

    expect(errors.getFailedResultFromError(thrownError)).toEqual({
      resultComment: 'The rule subject is invalid.',
      resultFindings: [validationFinding.finding],
    });
  });

  it('should fall back to the validationFinding message when issue message is undefined', () => {
    const alwaysFailSchema = z.object({}).superRefine((_data, context) => {
      context.addIssue({ code: 'custom' } as never);
    });

    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: {},
        schema: alwaysFailSchema,
        validationFinding,
      }),
    ).toThrow('The rule subject is invalid.');
  });
});
