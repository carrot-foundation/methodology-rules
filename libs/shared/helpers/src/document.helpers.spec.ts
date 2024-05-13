import { faker } from '@faker-js/faker';

import { toDocumentKey } from './document.helpers';

describe('toDocumentKey', () => {
  it('should return the correct document key when documentId is a string', () => {
    const documentId = faker.string.uuid();
    const documentKeyPrefix = faker.string.uuid();

    const result = toDocumentKey({ documentId, documentKeyPrefix });

    expect(result).toBe(`${documentKeyPrefix}/${documentId}.json`);
  });

  it('should return undefined when documentId is undefined', () => {
    const documentId = undefined;
    const documentKeyPrefix = faker.string.uuid();

    const result = toDocumentKey({ documentId, documentKeyPrefix });

    expect(result).toBeUndefined();
  });
});
