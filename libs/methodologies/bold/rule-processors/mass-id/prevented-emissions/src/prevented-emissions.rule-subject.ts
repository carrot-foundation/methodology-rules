import {
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DocumentEventAttributeValueSchema,
  NonEmptyStringSchema,
  NonNegativeFloatSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const PreventedEmissionsRuleSubjectSchema = z.object({
  baseline: z.enum(MethodologyBaseline).optional(),
  exceedingEmissionCoefficient: DocumentEventAttributeValueSchema.optional(),
  gasType: NonEmptyStringSchema,
  localWasteClassificationId: NonEmptyStringSchema.optional(),
  massIDDocumentValue: NonNegativeFloatSchema,
  normalizedLocalWasteClassificationId: NonEmptyStringSchema.optional(),
  wasteSubtype: z.enum(MassIDOrganicSubtype),
});

export type PreventedEmissionsRuleSubject = z.infer<
  typeof PreventedEmissionsRuleSubjectSchema
>;
