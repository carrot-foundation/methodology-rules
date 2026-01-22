import {
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventAttributeValue,
  NonEmptyString,
  NonNegativeFloat,
  Percentage,
} from '@carrot-fndn/shared/types';

export interface OthersIfOrganicCarbonEntry {
  carbonFraction: Percentage;
}

export type OthersIfOrganicRuleSubjectIds = {
  localWasteClassificationId?: NonEmptyString | undefined;
  normalizedLocalWasteClassificationId?: NonEmptyString | undefined;
};

export interface RuleSubject extends OthersIfOrganicRuleSubjectIds {
  exceedingEmissionCoefficient:
    | MethodologyDocumentEventAttributeValue
    | undefined;
  gasType: NonEmptyString;
  massIDDocumentValue: NonNegativeFloat;
  wasteGeneratorBaseline: MethodologyBaseline | undefined;
  wasteSubtype: MassIDOrganicSubtype;
}

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIDOrganicSubtype, MethodologyBaseline>
>;
