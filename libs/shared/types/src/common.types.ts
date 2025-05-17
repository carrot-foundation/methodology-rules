import type { tags } from 'typia';

import { type Latitude, type Longitude } from './number.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = Record<string, any>;
export type DateTime = string & tags.Format<'date-time'>;

export interface Geolocation {
  latitude: Latitude;
  longitude: Longitude;
}

export type Maybe<T> = null | T | undefined;

export type PredicateCallback<T> = (input: T) => boolean;

export interface StringObject {
  [key: string]: string;
}

export type UnknownObject = Record<string, unknown>;
