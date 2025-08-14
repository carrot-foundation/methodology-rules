import type { SetNonNullable, SetRequired } from 'type-fest';
import type { tags } from 'typia';

import type { NonEmptyString } from './string.types';

export type LicensePlate = NonEmptyString &
  tags.Pattern<`^([A-Z]{3}\\d[A-Z]\\d{2}|[A-Z]{3}-\\d{4}|[A-Z]{2}-\\d{4}|[A-Z]{3} \\d{4})$`>;

export type NonEmptyArray<T> = [T, ...T[]];

export type SetRequiredNonNullable<T, K extends keyof T> = SetRequired<
  SetNonNullable<T, K>,
  K
>;
