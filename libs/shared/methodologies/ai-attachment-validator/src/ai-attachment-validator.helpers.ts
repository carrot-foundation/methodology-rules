import { NonEmptyString } from '@carrot-fndn/shared/types';

export const formatInvalidField = (
  fieldName: NonEmptyString,
  reason: NonEmptyString | null,
): string => `${fieldName}: ${reason}`;
