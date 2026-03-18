import type { RuleOutputStatus } from './rule.types';

export interface ManifestFieldsOverride {
  /** Additional attribute names to include beyond what's in metadataAttributes */
  additionalAttributes?: string[];
  /** Attribute names to exclude from the auto-detected list */
  excludeAttributes?: string[];
  /** Address fields to include in the output (e.g. ['latitude', 'longitude']). Omit to strip addresses. */
  addressFields?: string[];
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
