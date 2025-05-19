import { DocumentLoaderService } from './document-loader.service';
import { DocumentRepository } from './document.repository';

const documentRepository = new DocumentRepository();

export const provideDocumentLoaderService = new DocumentLoaderService(
  documentRepository,
);
