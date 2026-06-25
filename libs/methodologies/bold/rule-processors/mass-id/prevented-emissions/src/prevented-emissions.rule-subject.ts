import {
  BoldBaseline,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DocumentEventAttributeValueSchema,
  NonEmptyStringSchema,
  NonNegativeFloatSchema,
  PercentageStringSchema,
} from '@carrot-fndn/shared/types';
import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';

// Mirrors the parseability check in `getGeneratorCarbonCharacterization`, so a
// malformed analysis date fails subject validation instead of surfacing later.
const IsoDateStringSchema = NonEmptyStringSchema.refine((value) =>
  isValid(parseISO(value)),
);

export const PreventedEmissionsRuleSubjectSchema = z.object({
  baseline: z.enum(BoldBaseline).optional(),
  exceedingEmissionCoefficient: DocumentEventAttributeValueSchema.optional(),
  gasType: NonEmptyStringSchema,
  generatorCarbonAnalysisDate: IsoDateStringSchema.optional(),
  generatorCarbonFraction: PercentageStringSchema.optional(),
  generatorCarbonMoisture: PercentageStringSchema.optional(),
  localWasteClassificationId: NonEmptyStringSchema.optional(),
  massIDDocumentValue: NonNegativeFloatSchema,
  normalizedLocalWasteClassificationId: NonEmptyStringSchema.optional(),
  // Kept lenient: a malformed pick-up date is bucketed as `missing` by the
  // resolver rather than failing subject validation outright.
  pickUpDate: NonEmptyStringSchema.optional(),
  wasteSubtype: z.enum(MassIDOrganicSubtype),
});

export type PreventedEmissionsRuleSubject = z.infer<
  typeof PreventedEmissionsRuleSubjectSchema
>;
