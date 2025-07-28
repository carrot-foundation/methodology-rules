import {
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventAttributeValue,
  NonEmptyString,
} from '@carrot-fndn/shared/types';

export interface RuleSubject {
  exceedingEmissionCoefficient:
    | MethodologyDocumentEventAttributeValue
    | undefined;
  gasType: NonEmptyString;
  massIdDocumentValue: number;
  wasteGeneratorBaseline: MethodologyBaseline | undefined;
  wasteSubtype: MassIdOrganicSubtype;
}

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIdOrganicSubtype, MethodologyBaseline>
>;
