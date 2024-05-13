import { random } from 'typia';

import type { DocumentEntity, DocumentKeyDto } from './document-loader.types';

export const stubDocumentKeyDto = (
  partial?: Partial<DocumentKeyDto>,
): DocumentKeyDto => ({
  ...random<DocumentKeyDto>(),
  ...partial,
});

export const stubDocumentEntity = (
  partial?: Partial<DocumentEntity>,
): DocumentEntity => ({
  ...random<DocumentEntity>(),
  ...partial,
});
