import type { Uri } from '@carrot-fndn/shared/types';

import { assert } from 'typia';

export const AI_ATTACHMENT_VALIDATOR_API_URI = assert<Uri>(
  process.env['AI_ATTACHMENT_VALIDATOR_API_URI'],
);

export const VALIDATION_MODE = 'flexible' as const;
export const VALID_MESSAGE = 'Attachment is valid';
export const FIELD_SEPARATOR = '; ';
export const VALIDATION_UNAVAILABLE_MESSAGE =
  'Validation service temporarily unavailable';
