import type { DocumentRelation } from '@carrot-fndn/shared/methodologies/bold/types';

import { z } from 'zod';

const DocumentSchema = z.looseObject({
  category: z.string(),
  createdAt: z.string(),
  currentValue: z.number(),
  dataSetName: z.string(),
  externalCreatedAt: z.string(),
  id: z.string(),
  isPubliclySearchable: z.boolean(),
  measurementUnit: z.string(),
  primaryAddress: z.looseObject({}),
  primaryParticipant: z.looseObject({}),
  status: z.string(),
  updatedAt: z.string(),
});

const DocumentRelationSchema = z.looseObject({
  documentId: z.string(),
});

export const isDocumentRelation = (input: unknown): input is DocumentRelation =>
  DocumentRelationSchema.safeParse(input).success;

export const validateDocument = (input: unknown) =>
  DocumentSchema.safeParse(input);

export const isObject = (input: unknown): input is object =>
  typeof input === 'object' && input !== null;

export const isRelatedDocumentCriteria = (
  input: unknown,
): input is { omit: true } =>
  isObject(input) && 'omit' in input && input.omit === true;
