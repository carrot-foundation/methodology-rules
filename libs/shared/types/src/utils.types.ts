import type { SetNonNullable, SetRequired } from 'type-fest';

export type NonEmptyArray<T> = [T, ...T[]];

export type SetRequiredNonNullable<T, K extends keyof T> = SetRequired<
  SetNonNullable<T, K>,
  K
>;
