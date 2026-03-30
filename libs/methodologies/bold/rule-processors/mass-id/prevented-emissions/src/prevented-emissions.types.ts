import {
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyString, PercentageString } from '@carrot-fndn/shared/types';

export interface OthersIfOrganicCarbonEntry {
  carbonFraction: PercentageString;
}

export type OthersIfOrganicRuleSubjectIds = {
  localWasteClassificationId?: NonEmptyString | undefined;
  normalizedLocalWasteClassificationId?: NonEmptyString | undefined;
};

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIDOrganicSubtype, MethodologyBaseline>
>;
