import type {
  Document,
  DocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { createIs, createValidate } from 'typia';

export const isDocumentRelation = createIs<DocumentRelation>();
export const validateDocument = createValidate<Document>();
export const isObject = createIs<object>();
export const isRelatedDocumentCriteria = createIs<{
  omit: true;
}>();
