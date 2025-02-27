export type NonNullableOrNullOrUndefined<T> = T extends null
  ? null
  : T extends undefined
    ? undefined
    : T;
