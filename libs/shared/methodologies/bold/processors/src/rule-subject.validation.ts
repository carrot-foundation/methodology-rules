import type { RenderedRuleFinding } from '@carrot-fndn/shared/rule/result';

import { logger } from '@carrot-fndn/shared/helpers';
import { z } from 'zod';

import { BaseProcessorErrors } from './base-processor.errors';

export function validateRuleSubjectOrThrow<TSchema extends z.ZodTypeAny>({
  errors,
  input,
  schema,
  validationFinding,
}: {
  errors: BaseProcessorErrors;
  input: unknown;
  schema: TSchema;
  validationFinding: RenderedRuleFinding;
}): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstIssueMessage = result.error.issues[0]?.message;
    const isCustomMessage =
      typeof firstIssueMessage === 'string' &&
      firstIssueMessage.length > 0 &&
      !firstIssueMessage.startsWith('Required') &&
      !firstIssueMessage.startsWith('Invalid input');
    const message = isCustomMessage
      ? firstIssueMessage
      : validationFinding.message;

    logger.error(
      { err: result.error, issues: result.error.issues, validationFinding },
      'Invalid rule subject',
    );
    throw errors.getKnownError(
      { finding: validationFinding.finding, message },
      { cause: result.error },
    );
  }

  return result.data;
}
