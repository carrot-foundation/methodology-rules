import {
  DocumentCategory,
  DocumentType,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { MASS_ID } = DocumentCategory;
const { KG } = MeasurementUnit;
const { ORGANIC } = DocumentType;

export const RESULT_COMMENTS = {
  failed: {
    INVALID_CATEGORY: (category: string): string =>
      `The document category must be "${MASS_ID}", but "${category}" was provided.`,
    INVALID_MEASUREMENT_UNIT: (measurementUnit: string): string =>
      `The measurement unit must be "${KG}", but "${measurementUnit}" was provided.`,
    INVALID_SUBTYPE: (subtype: unknown): string =>
      `The subtype "${String(subtype)}" is not among the allowed values.`,
    INVALID_TYPE: (type: string): string =>
      `The document type must be "${ORGANIC}", but "${type}" was provided.`,
    INVALID_VALUE: (value: number): string =>
      `The document value must be greater than 0, but "${value}" was provided.`,
  },
  passed: {
    PASSED:
      'The document category, measurement unit, subtype, type, and value are correctly defined.',
  },
  reviewRequired: {},
} as const;
