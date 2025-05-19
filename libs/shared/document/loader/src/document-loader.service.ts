import type { DocumentEntity, DocumentKeyDto } from './document-loader.types';

import { DocumentRepository } from './document.repository';
import { assertDocumentEntity } from './document.validators';

export class DocumentLoaderService {
  private readonly documentRepository: DocumentRepository;

  constructor(documentRepository: DocumentRepository) {
    this.documentRepository = documentRepository;
  }

  async load({ key }: DocumentKeyDto): Promise<DocumentEntity> {
    try {
      return await this.documentRepository.readFromS3<DocumentEntity>(
        key,
        assertDocumentEntity,
      );
    } catch (error) {
      throw new Error(`Unable to load document ${key}`, {
        cause: error,
      });
    }
  }
}
