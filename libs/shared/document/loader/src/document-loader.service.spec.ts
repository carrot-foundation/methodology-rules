import { DocumentLoaderService } from './document-loader.service';
import { DocumentRepository } from './document.repository';
import { stubDocumentEntity, stubDocumentKeyDto } from './document.stubs';

jest.mock('./document.repository');

describe('DocumentLoader', () => {
  const documentLoader = new DocumentLoaderService(new DocumentRepository());
  const documentRepository = jest.mocked(DocumentRepository.prototype);

  describe('load', () => {
    it('should load document', async () => {
      const document = stubDocumentEntity();

      documentRepository.readFromS3.mockResolvedValue(document);

      await expect(documentLoader.load(stubDocumentKeyDto())).resolves.toEqual(
        document,
      );
    });

    it('should throw error with document key when not possible to get document', async () => {
      documentRepository.readFromS3.mockRejectedValue(new Error('Error'));

      const dto = stubDocumentKeyDto();

      await expect(() => documentLoader.load(dto)).rejects.toThrow(
        `Unable to load document ${dto.key}`,
      );
    });
  });
});
