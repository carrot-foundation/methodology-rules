import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  failed: {
    CLASSIFICATION_DESCRIPTION_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" was not provided.`,
    CLASSIFICATION_ID_MISSING: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" was not provided.`,
    INVALID_CLASSIFICATION_DESCRIPTION: `The "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" does not match the expected local waste classification code description.`,
    INVALID_CLASSIFICATION_ID: `The "${LOCAL_WASTE_CLASSIFICATION_ID}" does not match the local waste classification code accepted by the methodology.`,
    INVALID_SUBTYPE_CDM_CODE_MISMATCH: `The subtype does not match the CDM code for the provided "${LOCAL_WASTE_CLASSIFICATION_ID}".`,
    INVALID_SUBTYPE_MAPPING: `The provided subtype does not map to a valid CDM code.`,
    UNSUPPORTED_COUNTRY: (recyclerCountryCode: string) =>
      `Local waste classification is only validated for recyclers in Brazil, but the recycler country is ${recyclerCountryCode}.`,
  },
  passed: {
    VALID_CLASSIFICATION: `The local waste classification "${LOCAL_WASTE_CLASSIFICATION_ID}" and "${LOCAL_WASTE_CLASSIFICATION_DESCRIPTION}" match an Ibama code.`,
  },
  reviewRequired: {},
} as const;
