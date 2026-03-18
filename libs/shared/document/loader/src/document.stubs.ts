import { faker } from '@faker-js/faker';

import type { DocumentEntity, DocumentKeyDto } from './document-loader.types';

export const stubDocumentKeyDto = (
  partial?: Partial<DocumentKeyDto>,
): DocumentKeyDto => ({
  key: faker.string.uuid(),
  ...partial,
});

export const stubDocumentEntity = (
  partial?: Partial<DocumentEntity>,
): DocumentEntity => ({
  createdAt: faker.date.past().toISOString(),
  document: {},
  id: faker.string.uuid(),
  versionDate: faker.date.past().toISOString(),
  ...partial,
});
