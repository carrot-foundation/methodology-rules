import type { NonZeroPositive, Uri } from '@carrot-fndn/shared/types';

import { createIs } from 'typia';

export const isNonZeroPositive = createIs<NonZeroPositive>();
export const isNumber = createIs<number>();
export const isUri = createIs<Uri>();
