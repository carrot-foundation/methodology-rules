import type { tags } from 'typia';

export type Url = string & tags.Format<'url'>;

export type Uri = string & tags.Format<'uri'>;

export type NonEmptyString = string & tags.MinLength<1>;
