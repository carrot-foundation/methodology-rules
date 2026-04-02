import {
  type DocumentEntity,
  type DocumentLoaderService,
} from '@carrot-fndn/shared/document/loader';
import { stubDocumentEntity } from '@carrot-fndn/shared/document/loader/stubs';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import { loadDocument } from './document.helpers';

const loaderService = {
  load: vi.fn(),
} as unknown as DocumentLoaderService;

describe('Document Helpers', () => {
  describe('loadDocument', () => {
    it('should return undefined if no key is provided', async () => {
      const key = undefined;

      const result = await loadDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the provided key is an empty string', async () => {
      const key = '';

      const result = await loadDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the loaded document is not a valid Document', async () => {
      const key = faker.string.uuid();

      vi.spyOn(loaderService, 'load').mockResolvedValueOnce(
        stubDocumentEntity() as DocumentEntity<BoldDocument>,
      );

      const result = await loadDocument(loaderService, key);

      expect(result).toBe(undefined);
    });

    it('should return the document', async () => {
      const key = faker.string.uuid();
      const document = stubDocument();

      vi.spyOn(loaderService, 'load').mockResolvedValueOnce(
        stubDocumentEntity({ document }),
      );

      const result = await loadDocument(loaderService, key);

      expect(result).toEqual(document);
    });

    it('should return undefined when document loading throws an error', async () => {
      const key = faker.string.uuid();

      vi.spyOn(loaderService, 'load').mockRejectedValueOnce(
        new Error('Not found document for Parent Document Key'),
      );

      const result = await loadDocument(loaderService, key);

      expect(result).toBe(undefined);
    });
  });
});
