import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helper: builds a z.enum schema from a const-object's values
// ---------------------------------------------------------------------------

function valuesOf<T extends Record<string, string>>(
  object: T,
): [T[keyof T], ...T[keyof T][]] {
  return Object.values(object) as [T[keyof T], ...T[keyof T][]];
}

// ---------------------------------------------------------------------------
// Bold methodology-level enums
// ---------------------------------------------------------------------------

export const BoldMethodologyName = {
  CARBON: 'BOLD Carbon',
  RECYCLING: 'BOLD Recycling',
} as const;
export const BoldMethodologyNameSchema = z.enum(valuesOf(BoldMethodologyName));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldMethodologyName = z.infer<typeof BoldMethodologyNameSchema>;

export const BoldMethodologySlug = {
  CARBON: 'bold-carbon',
  RECYCLING: 'bold-recycling',
} as const;
export const BoldMethodologySlugSchema = z.enum(valuesOf(BoldMethodologySlug));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldMethodologySlug = z.infer<typeof BoldMethodologySlugSchema>;

export const BoldDocumentCategory = {
  MASS_ID: 'MassID',
  METHODOLOGY: 'Methodology',
} as const;
export const BoldDocumentCategorySchema = z.enum(
  valuesOf(BoldDocumentCategory),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldDocumentCategory = z.infer<typeof BoldDocumentCategorySchema>;

export const BoldAccreditationStatus = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;
export const BoldAccreditationStatusSchema = z.enum(
  valuesOf(BoldAccreditationStatus),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldAccreditationStatus = z.infer<
  typeof BoldAccreditationStatusSchema
>;

export const BoldAttachmentLabel = {
  RECYCLING_MANIFEST: 'Recycling Manifest',
  TRANSPORT_MANIFEST: 'Transport Manifest',
  WEIGHING_TICKET: 'Weighing Ticket',
} as const;
export const BoldAttachmentLabelSchema = z.enum(valuesOf(BoldAttachmentLabel));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldAttachmentLabel = z.infer<typeof BoldAttachmentLabelSchema>;

export const BoldAttributeName = {
  ACCREDITATION_STATUS: 'Accreditation Status',
  APPROVED_EXCEPTIONS: 'Approved Exceptions',
  BASELINES: 'Baselines',
  BUSINESS_SIZE_DECLARATION: 'Business Size Declaration',
  CAPTURED_GPS_LATITUDE: 'Captured GPS Latitude',
  CAPTURED_GPS_LONGITUDE: 'Captured GPS Longitude',
  CONTAINER_CAPACITY: 'Container Capacity',
  CONTAINER_QUANTITY: 'Container Quantity',
  CONTAINER_TYPE: 'Container Type',
  CREDIT_UNIT_PRICE: 'Credit Unit Price',
  DEDUCTED_WEIGHT: 'Deducted Weight',
  DESCRIPTION: 'Description',
  DOCUMENT_NUMBER: 'Document Number',
  DOCUMENT_TYPE: 'Document Type',
  DRIVER_IDENTIFIER: 'Driver Identifier',
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION:
    'Driver Identifier Exemption Justification',
  EFFECTIVE_DATE: 'Effective Date',
  EVALUATION_RESULT: 'Evaluation Result',
  EXCEEDING_EMISSION_COEFFICIENT: 'Exceeding Emission Coefficient (per ton)',
  EXEMPTION_JUSTIFICATION: 'Exemption Justification',
  EXPIRATION_DATE: 'Expiration Date',
  GREENHOUSE_GAS_TYPE: 'Greenhouse Gas Type (GHG)',
  GROSS_WEIGHT: 'Gross Weight',
  ISSUE_DATE: 'Issue Date',
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION:
    'Local Waste Classification Description',
  LOCAL_WASTE_CLASSIFICATION_ID: 'Local Waste Classification ID',
  METHODOLOGY_SLUG: 'Methodology Slug',
  RECEIVING_OPERATOR_IDENTIFIER: 'Receiving Operator Identifier',
  RECYCLER_OPERATOR_IDENTIFIER: 'Recycler Operator Identifier',
  REFERENCE_YEAR: 'Reference Year',
  REQUIRED_ADDITIONAL_VERIFICATIONS: 'Required Additional Verifications',
  RULE_PROCESSOR_RESULT_CONTENT: 'Rule Processor Result Content',
  RULE_RESULT_DETAILS: 'Rule Result Details',
  SCALE_TYPE: 'Scale Type',
  SCALE_VALIDATION: 'Scale Validation',
  SLUG: 'Slug',
  SORTING_FACTOR: 'Sorting Factor',
  TARE: 'Tare',
  VEHICLE_DESCRIPTION: 'Vehicle Description',
  VEHICLE_LICENSE_PLATE: 'Vehicle License Plate',
  VEHICLE_TYPE: 'Vehicle Type',
  WASTE_ORIGIN: 'Waste Origin',
  WEIGHING_CAPTURE_METHOD: 'Weighing Capture Method',
} as const;
export const BoldAttributeNameSchema = z.enum(valuesOf(BoldAttributeName));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldAttributeName = z.infer<typeof BoldAttributeNameSchema>;

export const BoldAttributeValue = {
  LARGE_BUSINESS: 'Large Business',
  SMALL_BUSINESS: 'Small Business',
  UNIDENTIFIED: 'Unidentified',
} as const;
export const BoldAttributeValueSchema = z.enum(valuesOf(BoldAttributeValue));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldAttributeValue = z.infer<typeof BoldAttributeValueSchema>;

export const BoldContainerType = {
  BAG: 'Bag',
  BIN: 'Bin',
  DRUM: 'Drum',
  PAIL: 'Pail',
  STREET_BIN: 'Street Bin',
  TRUCK: 'Truck',
  WASTE_BOX: 'Waste Box',
} as const;
export const BoldContainerTypeSchema = z.enum(valuesOf(BoldContainerType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldContainerType = z.infer<typeof BoldContainerTypeSchema>;

export const BoldDocumentEventName = {
  ACCREDITATION_CONTEXT: 'Accreditation Context',
  ACCREDITATION_RESULT: 'Accreditation Result',
  ACTOR: 'ACTOR',
  CLOSE: 'CLOSE',
  DROP_OFF: 'Drop-off',
  EMISSION_AND_COMPOSTING_METRICS: 'Emissions & Composting Metrics',
  END: 'END',
  FACILITY_ADDRESS: 'Facility Address',
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE: 'Legal & Administrative Compliance',
  LINK: 'LINK',
  MONITORING_SYSTEMS_AND_EQUIPMENT: 'Monitoring Systems & Equipment',
  MOVE: 'MOVE',
  NOTICE: 'NOTICE',
  ONBOARDING_DECLARATION: 'Onboarding Declaration',
  OUTPUT: 'OUTPUT',
  PICK_UP: 'Pick-up',
  RECYCLED: 'Recycled',
  RECYCLING_BASELINES: 'Recycling Baselines',
  RECYCLING_MANIFEST: 'Recycling Manifest',
  RELATED: 'RELATED',
  RULE_EXECUTION: 'RULE EXECUTION',
  RULES_METADATA: 'RULES METADATA',
  SORTING: 'Sorting',
  TRANSPORT_MANIFEST: 'Transport Manifest',
  WASTE_GENERATOR: 'Waste Generator',
  WEIGHING: 'Weighing',
} as const;
export const BoldDocumentEventNameSchema = z.enum(
  valuesOf(BoldDocumentEventName),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldDocumentEventName = z.infer<typeof BoldDocumentEventNameSchema>;

export const BoldRuleSlug = {
  REWARDS_DISTRIBUTION: 'rewards-distribution',
} as const;
export const BoldRuleSlugSchema = z.enum(valuesOf(BoldRuleSlug));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldRuleSlug = z.infer<typeof BoldRuleSlugSchema>;

export const BoldScaleType = {
  BIN_SCALE: 'Bin Scale',
  CONVEYOR_BELT_SCALE: 'Conveyor Belt Scale',
  FLOOR_SCALE: 'Floor Scale',
  FORKLIFT_SCALE: 'Forklift Scale',
  HANGING_OR_CRANE_SCALE: 'Hanging / Crane Scale',
  ONBOARD_TRUCK_SCALE: 'Onboard Truck Scale',
  PALLET_SCALE: 'Pallet Scale',
  PORTABLE_AXLE_WEIGHER: 'Portable Axle Weigher',
  PRECISION_OR_BENCH_SCALE: 'Precision / Bench Scale',
  WEIGHBRIDGE: 'Weighbridge (Truck Scale)',
} as const;
export const BoldScaleTypeSchema = z.enum(valuesOf(BoldScaleType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldScaleType = z.infer<typeof BoldScaleTypeSchema>;

export const BoldVehicleType = {
  BICYCLE: 'Bicycle',
  BOAT: 'Boat',
  CAR: 'Car',
  CARGO_SHIP: 'Cargo Ship',
  CART: 'Cart',
  MINI_VAN: 'Mini Van',
  MOTORCYCLE: 'Motorcycle',
  OTHERS: 'Others',
  SLUDGE_PIPES: 'Sludge Pipes',
  TRUCK: 'Truck',
} as const;
export const BoldVehicleTypeSchema = z.enum(valuesOf(BoldVehicleType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldVehicleType = z.infer<typeof BoldVehicleTypeSchema>;

export const BoldWeighingCaptureMethod = {
  DIGITAL: 'Digital',
  MANUAL: 'Manual',
  PHOTO: 'Photo (Scale + Cargo)',
  TRANSPORT_MANIFEST: 'Transport Manifest',
} as const;
export const BoldWeighingCaptureMethodSchema = z.enum(
  valuesOf(BoldWeighingCaptureMethod),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldWeighingCaptureMethod = z.infer<
  typeof BoldWeighingCaptureMethodSchema
>;

// ---------------------------------------------------------------------------
// MassID domain enums
// ---------------------------------------------------------------------------

export const MassIDOrganicSubtype = {
  DOMESTIC_SLUDGE: 'Domestic Sludge',
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE:
    'EFB similar to Garden, Yard and Park Waste',
  FOOD_FOOD_WASTE_AND_BEVERAGES: 'Food, Food Waste and Beverages',
  GARDEN_YARD_AND_PARK_WASTE: 'Garden, Yard and Park Waste',
  INDUSTRIAL_SLUDGE: 'Industrial Sludge',
  OTHERS_IF_ORGANIC: 'Others (if organic)',
  TOBACCO: 'Tobacco',
  WOOD_AND_WOOD_PRODUCTS: 'Wood and Wood Products',
} as const;
export const MassIDOrganicSubtypeSchema = z.enum(
  valuesOf(MassIDOrganicSubtype),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type MassIDOrganicSubtype = z.infer<typeof MassIDOrganicSubtypeSchema>;

export const BoldDocumentSubtype = {
  DOMESTIC_SLUDGE: MassIDOrganicSubtype.DOMESTIC_SLUDGE,
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE:
    MassIDOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE,
  FOOD_FOOD_WASTE_AND_BEVERAGES:
    MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
  GARDEN_YARD_AND_PARK_WASTE: MassIDOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE,
  GROUP: 'Group',
  HAULER: 'Hauler',
  INDUSTRIAL_SLUDGE: MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
  INTEGRATOR: 'Integrator',
  OTHERS_IF_ORGANIC: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
  PROCESS: 'Process',
  PROCESSOR: 'Processor',
  RECYCLER: 'Recycler',
  SOURCE: 'Source',
  TCC: 'TCC',
  TOBACCO: MassIDOrganicSubtype.TOBACCO,
  TRC: 'TRC',
  WASTE_GENERATOR: 'Waste Generator',
  WOOD_AND_WOOD_PRODUCTS: MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
} as const;
export const BoldDocumentSubtypeSchema = z.enum(valuesOf(BoldDocumentSubtype));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldDocumentSubtype = z.infer<typeof BoldDocumentSubtypeSchema>;

export const BoldDocumentType = {
  CREDIT_ORDER: 'Credit Order',
  DEFINITION: 'Definition',
  GAS_ID: 'GasID',
  MASS_ID_AUDIT: 'MassID Audit',
  ORGANIC: 'Organic',
  PARTICIPANT_ACCREDITATION: 'Participant Accreditation',
  RECYCLED_ID: 'RecycledID',
} as const;
export const BoldDocumentTypeSchema = z.enum(valuesOf(BoldDocumentType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldDocumentType = z.infer<typeof BoldDocumentTypeSchema>;

export const MassIDActorType = {
  HAULER: 'Hauler',
  INTEGRATOR: 'Integrator',
  PROCESSOR: 'Processor',
  RECYCLER: 'Recycler',
  WASTE_GENERATOR: 'Waste Generator',
} as const;
export const MassIDActorTypeSchema = z.enum(valuesOf(MassIDActorType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type MassIDActorType = z.infer<typeof MassIDActorTypeSchema>;

export const BoldBaseline = {
  LANDFILLS_WITH_FLARING_OF_METHANE_GAS:
    'Landfills with flaring of methane gas (and/or capture of biogas)',
  LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS:
    'Landfills without flaring of methane gas',
  OPEN_AIR_DUMP: 'Open-air dump',
} as const;
export const BoldBaselineSchema = z.enum(valuesOf(BoldBaseline));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldBaseline = z.infer<typeof BoldBaselineSchema>;

export const BoldMethodologyActorType = {
  COMMUNITY_IMPACT_POOL: 'Community Impact Pool',
  METHODOLOGY_AUTHOR: 'Methodology Author',
  METHODOLOGY_DEVELOPER: 'Methodology Developer',
  NETWORK: 'Network',
} as const;
export const BoldMethodologyActorTypeSchema = z.enum(
  valuesOf(BoldMethodologyActorType),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldMethodologyActorType = z.infer<
  typeof BoldMethodologyActorTypeSchema
>;

export const BoldReportType = {
  CDF: 'CDF',
  MTR: 'MTR',
} as const;
export const BoldReportTypeSchema = z.enum(valuesOf(BoldReportType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldReportType = z.infer<typeof BoldReportTypeSchema>;

// ---------------------------------------------------------------------------
// Composite / alias types
// ---------------------------------------------------------------------------

export const BoldActorType = {
  AUDITOR: 'Auditor',
  COMMUNITY_IMPACT_POOL: 'Community Impact Pool',
  HAULER: 'Hauler',
  INTEGRATOR: 'Integrator',
  METHODOLOGY_AUTHOR: 'Methodology Author',
  METHODOLOGY_DEVELOPER: 'Methodology Developer',
  NETWORK: 'Network',
  PROCESSOR: 'Processor',
  RECYCLER: 'Recycler',
  REMAINDER: 'Remainder',
  SOURCE: 'Source',
  WASTE_GENERATOR: 'Waste Generator',
} as const;
export const BoldActorTypeSchema = z.enum(valuesOf(BoldActorType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldActorType = z.infer<typeof BoldActorTypeSchema>;

export const BoldDocumentEventLabel = BoldActorType;
// eslint-disable-next-line no-redeclare, sonarjs/redundant-type-aliases -- intentional: preserves named export used by consumers
export type BoldDocumentEventLabel = BoldActorType;

export const BoldApprovedExceptionType = {
  MANDATORY_ATTRIBUTE: 'Exemption for Mandatory Attribute',
} as const;
export const BoldApprovedExceptionTypeSchema = z.enum(
  valuesOf(BoldApprovedExceptionType),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldApprovedExceptionType = z.infer<
  typeof BoldApprovedExceptionTypeSchema
>;

export const BoldParticipantType = {
  ACTOR: 'ACTOR',
} as const;
export const BoldParticipantTypeSchema = z.enum(valuesOf(BoldParticipantType));
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type BoldParticipantType = z.infer<typeof BoldParticipantTypeSchema>;

export const MassIDLikeDocumentType = {
  GAS_ID: BoldDocumentType.GAS_ID,
  ORGANIC: BoldDocumentType.ORGANIC,
  RECYCLED_ID: BoldDocumentType.RECYCLED_ID,
} as const;
export const MassIDLikeDocumentTypeSchema = z.enum(
  valuesOf(MassIDLikeDocumentType),
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type MassIDLikeDocumentType = z.infer<
  typeof MassIDLikeDocumentTypeSchema
>;
