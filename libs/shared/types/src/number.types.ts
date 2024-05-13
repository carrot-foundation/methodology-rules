import type { tags } from 'typia';

export type NonZeroPositive = number &
  tags.ExclusiveMinimum<0> &
  tags.Type<'float'>;
