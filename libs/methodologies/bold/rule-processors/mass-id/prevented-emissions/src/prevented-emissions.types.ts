import {
  BoldBaseline,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyString, PercentageString } from '@carrot-fndn/shared/types';

export interface GeneratorCarbonCharacterization {
  analysisDate: NonEmptyString;
  carbonFraction: PercentageString;
  moistureFraction: PercentageString;
}

export interface OthersIfOrganicCarbonEntry {
  carbonFraction: PercentageString;
}

export type OthersIfOrganicCarbonResolution =
  | {
      analysisDate: NonEmptyString;
      carbonFraction: PercentageString;
      moistureFraction: PercentageString;
      resolved: true;
      source: 'generator';
    }
  | {
      carbonFraction: PercentageString;
      resolved: true;
      source: 'author';
    }
  | {
      reason: 'expired' | 'missing';
      resolved: false;
    };

export type OthersIfOrganicRuleSubjectIds = {
  localWasteClassificationId?: NonEmptyString | undefined;
  normalizedLocalWasteClassificationId?: NonEmptyString | undefined;
};

export type WasteGeneratorBaselineValues = Partial<
  Record<MassIDOrganicSubtype, BoldBaseline>
>;
