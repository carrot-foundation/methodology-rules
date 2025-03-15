import type { tags } from 'typia';

export type Url = string & tags.Format<'url'>;

export type Uri = string & tags.Format<'uri'>;

export type NonEmptyString = string & tags.MinLength<1>;

export type LicensePlate = NonEmptyString &
  tags.Pattern<'^([A-Z]{3}\\d[A-Z]\\d{2}|[A-Z]{3}-\\d{4}|[A-Z]{2}-\\d{4})$'>;
