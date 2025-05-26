import {
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

export interface RuleSubject {
  exceedingEmissionCoefficient:
    | MethodologyDocumentEventAttributeValue
    | undefined;
  massIdDocumentValue: number;
  wasteGeneratorBaseline: MethodologyBaseline | undefined;
  wasteSubtype: MassIdOrganicSubtype;
}

export type WasteGeneratorBaselinesValue = Partial<
  Record<MassIdOrganicSubtype, MethodologyBaseline>
>;
