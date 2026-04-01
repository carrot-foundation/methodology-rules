import {
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MeasurementUnit } from '@carrot-fndn/shared/types';

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
    VALID_QUALIFICATIONS: `The document qualifications are valid: category is "${MASS_ID}", type is "${ORGANIC}", measurement unit is "${KG}", and value is greater than 0.`,
  },
  reviewRequired: {},
} as const;
