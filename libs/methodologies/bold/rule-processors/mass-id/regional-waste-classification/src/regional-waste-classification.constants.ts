export const RESULT_COMMENTS = {
  failed: {
    CLASSIFICATION_DESCRIPTION_MISSING: `The "Local Waste Classification Description" was not provided.`,
    CLASSIFICATION_ID_MISSING: `The "Local Waste Classification ID" was not provided.`,
    INVALID_CLASSIFICATION_DESCRIPTION: `The "Local Waste Classification Description" does not match the expected local waste classification code description.`,
    INVALID_CLASSIFICATION_ID: `The "Local Waste Classification ID" does not match the local waste classification code accepted by the methodology.`,
    INVALID_SUBTYPE_CDM_CODE_MISMATCH: `The subtype does not match the CDM code for the provided "Local Waste Classification ID".`,
    INVALID_SUBTYPE_MAPPING: `The provided subtype does not map to a valid CDM code.`,
    UNSUPPORTED_COUNTRY: (recyclerCountryCode: string) =>
      `Local waste classification is only validated for recyclers in Brazil, but the recycler country is ${recyclerCountryCode}.`,
  },
  passed: {
    VALID_CLASSIFICATION: `The local waste classification "Local Waste Classification ID" and "Local Waste Classification Description" provided in the Pick-up event match a valid Ibama code for the recycler's country.`,
  },
  reviewRequired: {},
} as const;
