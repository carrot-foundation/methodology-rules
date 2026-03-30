import {
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DocumentEventAttributeValue,
  NonEmptyString,
  NonNegativeFloat,
  PercentageString,
} from '@carrot-fndn/shared/types';

export interface OthersIfOrganicCarbonEntry {
  carbonFraction: PercentageString;
}

export type OthersIfOrganicRuleSubjectIds = {
  localWasteClassificationId?: NonEmptyString | undefined;
  normalizedLocalWasteClassificationId?: NonEmptyString | undefined;
};

export interface RuleSubject extends OthersIfOrganicRuleSubjectIds {
  baseline: MethodologyBaseline | undefined;
  exceedingEmissionCoefficient: DocumentEventAttributeValue | undefined;
  gasType: NonEmptyString;
  massIDDocumentValue: NonNegativeFloat;
  wasteSubtype: MassIDOrganicSubtype;
}

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIDOrganicSubtype, MethodologyBaseline>
>;
