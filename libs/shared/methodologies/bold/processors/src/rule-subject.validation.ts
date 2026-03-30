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
    logger.error(
      { err: result.error, issues: result.error.issues, validationMessage },
      'Invalid rule subject',
    );
    throw errors.getKnownError(validationMessage, {
      cause: result.error,
    });
  }

  return result.data;
}
