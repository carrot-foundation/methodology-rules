import type { tags } from 'typia';

export type Latitude = number &
  tags.Maximum<90> &
  tags.Minimum<-90> &
  tags.Type<'float'>;

export type Longitude = number &
  tags.Maximum<180> &
  tags.Minimum<-180> &
  tags.Type<'float'>;

export type NonZeroPositive = number &
  tags.ExclusiveMinimum<0> &
  tags.Type<'float'>;

export type NonZeroPositiveInt = number &
  tags.ExclusiveMinimum<0> &
  tags.Type<'int64'>;
