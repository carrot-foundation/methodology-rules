import type { BoldDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/types';

import { z } from 'zod';

export { validateDocument } from './document-helpers.validators';

const BoldDocumentRelationSchema = z.looseObject({
  documentId: z.string(),
});

export const isDocumentRelation = (
  input: unknown,
): input is BoldDocumentRelation =>
  BoldDocumentRelationSchema.safeParse(input).success;

export const isObject = (input: unknown): input is object =>
  typeof input === 'object' && input !== null;

export const isRelatedDocumentCriteria = (
  input: unknown,
): input is { omit: true } =>
  isObject(input) && 'omit' in input && input.omit === true;
