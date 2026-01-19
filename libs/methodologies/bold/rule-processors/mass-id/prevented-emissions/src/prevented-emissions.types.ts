import {
  MassIDOrganicSubtype,
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
  massIDDocumentValue: number;
  wasteGeneratorBaseline: MethodologyBaseline | undefined;
  wasteSubtype: MassIDOrganicSubtype;
}

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIDOrganicSubtype, MethodologyBaseline>
>;
