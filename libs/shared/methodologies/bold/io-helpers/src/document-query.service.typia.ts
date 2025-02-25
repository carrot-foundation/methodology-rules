import type {
  Document,
  DocumentReference,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { createIs, createValidate } from 'typia';

export const isDocumentReference = createIs<DocumentReference>();
export const validateDocument = createValidate<Document>();
export const isObject = createIs<object>();
export const isRelatedDocumentCriteria = createIs<{
  omit: true;
}>();
