import { logger } from '@carrot-fndn/shared/helpers';
import { z } from 'zod';

import { BaseProcessorErrors } from './base-processor.errors';

export function validateRuleSubjectOrThrow<TSchema extends z.ZodTypeAny>({
  errors,
  input,
  schema,
  validationMessage,
}: {
  errors: BaseProcessorErrors;
  input: unknown;
  schema: TSchema;
  validationMessage: string;
}): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const firstIssueMessage = result.error.issues[0]?.message;
    const isCustomMessage =
      typeof firstIssueMessage === 'string' &&
      firstIssueMessage.length > 0 &&
      !firstIssueMessage.startsWith('Required') &&
      !firstIssueMessage.startsWith('Invalid input');
    const message = isCustomMessage ? firstIssueMessage : validationMessage;

    logger.error(
      { err: result.error, issues: result.error.issues, validationMessage },
      'Invalid rule subject',
    );
    throw errors.getKnownError(message, {
      cause: result.error,
    });
  }

  return result.data;
}
