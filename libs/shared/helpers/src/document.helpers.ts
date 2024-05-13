export const toDocumentKey = <
  T extends string | undefined,
  R = T extends string ? string : undefined,
>({
  documentId,
  documentKeyPrefix,
}: {
  documentId: T;
  documentKeyPrefix: string;
}): R => {
  if (typeof documentId === 'string') {
    return `${documentKeyPrefix}/${documentId}.json` as R;
  }

  return undefined as R;
};
