import type { RuleOutputStatus } from './rule.types';

export interface ManifestFieldsOverride {
  /** Additional attribute names to include beyond what's in metadataAttributes */
  additionalAttributes?: string[];
  /** Address fields to include in the output (e.g. ['latitude', 'longitude']). Omit to output an empty address object. */
  addressFields?: string[];
  /** Attribute names to exclude from the auto-detected list */
  excludeAttributes?: string[];
  /** Include document currentValue in output (default: false) */
  includeCurrentValue?: boolean;
  /** Include event value in output (default: false) */
  includeValue?: boolean;
}

export interface RuleTestCase {
  manifestExample?: boolean;
  manifestFields?: ManifestFieldsOverride;
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
}
