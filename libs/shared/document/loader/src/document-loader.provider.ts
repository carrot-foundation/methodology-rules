import { DocumentRepository } from './document.repository';
import { DocumentLoaderService } from './document-loader.service';

const documentRepository = new DocumentRepository();

export const provideDocumentLoaderService = new DocumentLoaderService(
  documentRepository,
);
