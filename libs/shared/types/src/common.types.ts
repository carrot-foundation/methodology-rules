import { type Latitude, type Longitude } from './number.types';

export type Maybe<T> = T | null | undefined;
export type UnknownObject = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = Record<string, any>;

export interface StringObject {
  [key: string]: string;
}

const primitiveTypeUselessVariable = typeof (0 as unknown);

export type PrimitiveType = typeof primitiveTypeUselessVariable;

export type PredicateCallback<T> = (input: T) => boolean;

export interface Geolocation {
  latitude: Latitude;
  longitude: Longitude;
}
