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

  it('should throw a known processor error when validation fails', () => {
    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: { type: 'Unknown' },
        schema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow('The rule subject is invalid.');
  });

  it('should log validation issues on failure', () => {
    const loggerWarnSpy = vi.spyOn(logger, 'warn');

    expect(() =>
      validateRuleSubjectOrThrow({
        errors,
        input: { type: 'Invalid' },
        schema,
        validationMessage: errors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      }),
    ).toThrow();

    expect(loggerWarnSpy).toHaveBeenCalled();
  });
});
