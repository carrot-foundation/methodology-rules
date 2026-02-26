import type { DocumentLoader } from './document-loader.types';

import { CachedDocumentLoaderService } from './cached-document-loader.service';
import { DocumentLoaderService } from './document-loader.service';
import { DocumentRepository } from './document.repository';

const documentLoaderService = new DocumentLoaderService(
  new DocumentRepository(),
);

let resolvedService: DocumentLoader | undefined;

const getService = (): DocumentLoader => {
  if (!resolvedService) {
    const cacheDirectory = process.env['DOCUMENT_CACHE_DIR'];

    resolvedService = cacheDirectory
      ? new CachedDocumentLoaderService(documentLoaderService, cacheDirectory)
      : documentLoaderService;
  }

  return resolvedService;
};

export const provideDocumentLoaderService: DocumentLoader = {
  load: (dto) => getService().load(dto),
};
