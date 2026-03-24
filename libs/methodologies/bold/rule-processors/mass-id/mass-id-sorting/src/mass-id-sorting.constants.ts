export const SORTING_TOLERANCE = 0.1;

export const RESULT_COMMENTS = {
  failed: {
    DEDUCTED_WEIGHT_MISMATCH: (deducted: number, expected: number) =>
      `The "Deducted Weight" (${deducted} kg) must equal "Gross Weight" × "Sorting Factor" (${expected} kg) within ${SORTING_TOLERANCE} kg.`,
    DOCUMENT_VALUE_MISMATCH: (documentValue: number, sortingValue: number) =>
      `The MassID document current value (${documentValue} kg) must equal the sorting event value (${sortingValue} kg).`,
    GROSS_WEIGHT_MISMATCH: (gross: number, before: number) =>
      `The "Gross Weight" (${gross} kg) must match the previous event value (${before} kg) within ${SORTING_TOLERANCE} kg.`,
    MISSING_SORTING_DESCRIPTION: `The "Description" must be provided.`,
    SORTING_VALUE_EXCEEDS_TOLERANCE: (
      sortingValueCalculationDifference: number,
    ) =>
      `The calculated sorting value differs from the actual value by ${sortingValueCalculationDifference} kg, exceeding the allowed tolerance of ${SORTING_TOLERANCE} kg.`,
  },
  passed: {
    SORTING_VALUE_WITHIN_TOLERANCE: (
      sortingValueCalculationDifference: number,
    ) =>
      `The calculated sorting value is within the allowed tolerance of ${SORTING_TOLERANCE} kg. The difference is ${sortingValueCalculationDifference} kg.`,
  },
  reviewRequired: {},
} as const;
