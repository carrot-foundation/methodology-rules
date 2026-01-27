import type { tags } from 'typia';

export type NonEmptyString = string & tags.MinLength<1>;

export type PercentageString = NonEmptyString &
  tags.Pattern<`^(0|1|0\\.\\d+|1\\.0+)$`>;

export type Uri = string & tags.Format<'uri'>;

export type Url = string & tags.Format<'url'>;
