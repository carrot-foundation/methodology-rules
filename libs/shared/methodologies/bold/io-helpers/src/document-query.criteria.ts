import { PARTICIPANT_ACCREDITATION_PARTIAL_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type {
  DocumentQueryCriteria,
  RelatedDocumentCriteria,
} from './document-query.service.types';

const RelatedDocumentCriteriaSchema: z.ZodType<RelatedDocumentCriteria> =
  z.lazy(() =>
    z.strictObject({
      category: NonEmptyStringSchema.optional(),
      omit: z.boolean().optional(),
      parentDocument: RelatedDocumentCriteriaSchema.optional(),
      relatedDocuments: z.array(RelatedDocumentCriteriaSchema).optional(),
      subtype: NonEmptyStringSchema.optional(),
      type: NonEmptyStringSchema.optional(),
    }),
  );

export const DocumentQueryCriteriaSchema: z.ZodType<DocumentQueryCriteria> =
  z.strictObject({
    parentDocument: RelatedDocumentCriteriaSchema.optional(),
    relatedDocuments: z.array(RelatedDocumentCriteriaSchema).optional(),
  });

export const RELATED_DOCUMENT_CRITERIA = {
  parentDocument: {},
  relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
} as const satisfies DocumentQueryCriteria;

export const ROOT_DOCUMENT_CRITERIA =
  {} as const satisfies DocumentQueryCriteria;
