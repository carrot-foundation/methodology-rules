import { stubDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { type Document } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type DocumentEntity,
  type DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import { faker } from '@faker-js/faker';
import { createMock } from '@golevelup/ts-jest';
import { random } from 'typia';

import { loadParentDocument } from './document.helpers';

const loaderService = createMock<DocumentLoaderService>();

describe('Document Helpers', () => {
  describe('loadParentDocument', () => {
    it('should return undefined if no key is provided', async () => {
      const key = undefined;

      const result = await loadParentDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the provided key is an empty string', async () => {
      const key = '';

      const result = await loadParentDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the loaded document is not a valid Document', async () => {
      const key = faker.string.uuid();

      jest
        .spyOn(loaderService, 'load')
        .mockResolvedValueOnce(
          random<DocumentEntity>() as DocumentEntity<Document>,
        );

      const result = await loadParentDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return the document', async () => {
      const key = faker.string.uuid();
      const document = stubDocument();

      jest
        .spyOn(loaderService, 'load')
        .mockResolvedValueOnce(stubDocumentEntity({ document }));

      const result = await loadParentDocument(loaderService, key);

      expect(result).toEqual(document);
    });
  });
});
