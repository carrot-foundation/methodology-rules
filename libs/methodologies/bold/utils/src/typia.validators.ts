import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { createValidate } from 'typia';

export const validateNonEmptyString = createValidate<NonEmptyString>();
