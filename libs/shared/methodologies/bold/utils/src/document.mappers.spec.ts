import type { DocumentReference } from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { faker } from '@faker-js/faker';

import { mapDocumentReference } from './document.mappers';

describe('Document Mappers', () => {
  describe('mapDocumentReference', () => {
    it('should return id, category, type and subtype', () => {
      const document = stubDocument({
        category: faker.string.sample(),
        id: faker.string.uuid(),
        subtype: faker.string.sample(),
        type: faker.string.sample(),
      });

      const result = mapDocumentReference(document);

      const expected: DocumentReference = {
        category: document.category,
        documentId: document.id,
        subtype: document.subtype,
        type: document.type,
      };

      expect(result).toEqual(expected);
    });
  });
});
