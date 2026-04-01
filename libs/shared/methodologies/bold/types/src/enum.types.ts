export enum BoldMethodologyName {
  CARBON = 'BOLD Carbon',
  RECYCLING = 'BOLD Recycling',
}

export enum BoldMethodologySlug {
  CARBON = 'bold-carbon',
  RECYCLING = 'bold-recycling',
}

export enum DocumentCategory {
  MASS_ID = 'MassID',
  METHODOLOGY = 'Methodology',
}

export enum DocumentEventAccreditationStatus {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum DocumentEventAttachmentLabel {
  RECYCLING_MANIFEST = 'Recycling Manifest',
  TRANSPORT_MANIFEST = 'Transport Manifest',
  WEIGHING_TICKET = 'Weighing Ticket',
}

export enum DocumentEventAttributeName {
  ACCREDITATION_STATUS = 'Accreditation Status',
  APPROVED_EXCEPTIONS = 'Approved Exceptions',
  BASELINES = 'Baselines',
  BUSINESS_SIZE_DECLARATION = 'Business Size Declaration',
  CAPTURED_GPS_LATITUDE = 'Captured GPS Latitude',
  CAPTURED_GPS_LONGITUDE = 'Captured GPS Longitude',
  CONTAINER_CAPACITY = 'Container Capacity',
  CONTAINER_QUANTITY = 'Container Quantity',
  CONTAINER_TYPE = 'Container Type',
  CREDIT_UNIT_PRICE = 'Credit Unit Price',
  DEDUCTED_WEIGHT = 'Deducted Weight',
  DESCRIPTION = 'Description',
  DOCUMENT_NUMBER = 'Document Number',
  DOCUMENT_TYPE = 'Document Type',
  DRIVER_IDENTIFIER = 'Driver Identifier',
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION = 'Driver Identifier Exemption Justification',
  EFFECTIVE_DATE = 'Effective Date',
  EVALUATION_RESULT = 'Evaluation Result',
  EXCEEDING_EMISSION_COEFFICIENT = 'Exceeding Emission Coefficient (per ton)',
  EXEMPTION_JUSTIFICATION = 'Exemption Justification',
  EXPIRATION_DATE = 'Expiration Date',
  GREENHOUSE_GAS_TYPE = 'Greenhouse Gas Type (GHG)',
  GROSS_WEIGHT = 'Gross Weight',
  ISSUE_DATE = 'Issue Date',
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION = 'Local Waste Classification Description',
  LOCAL_WASTE_CLASSIFICATION_ID = 'Local Waste Classification ID',
  METHODOLOGY_SLUG = 'Methodology Slug',
  RECEIVING_OPERATOR_IDENTIFIER = 'Receiving Operator Identifier',
  RECYCLER_OPERATOR_IDENTIFIER = 'Recycler Operator Identifier',
  REFERENCE_YEAR = 'Reference Year',
  REQUIRED_ADDITIONAL_VERIFICATIONS = 'Required Additional Verifications',
  RULE_PROCESSOR_RESULT_CONTENT = 'Rule Processor Result Content',
  RULE_RESULT_DETAILS = 'Rule Result Details',
  SCALE_TYPE = 'Scale Type',
  SCALE_VALIDATION = 'Scale Validation',
  SLUG = 'Slug',
  SORTING_FACTOR = 'Sorting Factor',
  TARE = 'Tare',
  VEHICLE_DESCRIPTION = 'Vehicle Description',
  VEHICLE_LICENSE_PLATE = 'Vehicle License Plate',
  VEHICLE_TYPE = 'Vehicle Type',
  WASTE_ORIGIN = 'Waste Origin',
  WEIGHING_CAPTURE_METHOD = 'Weighing Capture Method',
}

export enum DocumentEventAttributeValue {
  LARGE_BUSINESS = 'Large Business',
  SMALL_BUSINESS = 'Small Business',
  UNIDENTIFIED = 'Unidentified',
}

export enum DocumentEventContainerType {
  BAG = 'Bag',
  BIN = 'Bin',
  DRUM = 'Drum',
  PAIL = 'Pail',
  STREET_BIN = 'Street Bin',
  TRUCK = 'Truck',
  WASTE_BOX = 'Waste Box',
}

export enum DocumentEventName {
  ACCREDITATION_CONTEXT = 'Accreditation Context',
  ACCREDITATION_RESULT = 'Accreditation Result',
  ACTOR = 'ACTOR',
  CLOSE = 'CLOSE',
  DROP_OFF = 'Drop-off',
  EMISSION_AND_COMPOSTING_METRICS = 'Emissions & Composting Metrics',
  END = 'END',
  FACILITY_ADDRESS = 'Facility Address',
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE = 'Legal & Administrative Compliance',
  LINK = 'LINK',
  MONITORING_SYSTEMS_AND_EQUIPMENT = 'Monitoring Systems & Equipment',
  MOVE = 'MOVE',
  NOTICE = 'NOTICE',
  ONBOARDING_DECLARATION = 'Onboarding Declaration',
  OUTPUT = 'OUTPUT',
  PICK_UP = 'Pick-up',
  RECYCLED = 'Recycled',
  RECYCLING_BASELINES = 'Recycling Baselines',
  RECYCLING_MANIFEST = 'Recycling Manifest',
  RELATED = 'RELATED',
  RULE_EXECUTION = 'RULE EXECUTION',
  RULES_METADATA = 'RULES METADATA',
  SORTING = 'Sorting',
  TRANSPORT_MANIFEST = 'Transport Manifest',
  WASTE_GENERATOR = 'Waste Generator',
  WEIGHING = 'Weighing',
}

export enum DocumentEventRuleSlug {
  REWARDS_DISTRIBUTION = 'rewards-distribution',
}

export enum DocumentEventScaleType {
  BIN_SCALE = 'Bin Scale',
  CONVEYOR_BELT_SCALE = 'Conveyor Belt Scale',
  FLOOR_SCALE = 'Floor Scale',
  FORKLIFT_SCALE = 'Forklift Scale',
  HANGING_OR_CRANE_SCALE = 'Hanging / Crane Scale',
  ONBOARD_TRUCK_SCALE = 'Onboard Truck Scale',
  PALLET_SCALE = 'Pallet Scale',
  PORTABLE_AXLE_WEIGHER = 'Portable Axle Weigher',
  PRECISION_OR_BENCH_SCALE = 'Precision / Bench Scale',
  WEIGHBRIDGE = 'Weighbridge (Truck Scale)',
}

export enum DocumentEventVehicleType {
  BICYCLE = 'Bicycle',
  BOAT = 'Boat',
  CAR = 'Car',
  CARGO_SHIP = 'Cargo Ship',
  CART = 'Cart',
  MINI_VAN = 'Mini Van',
  MOTORCYCLE = 'Motorcycle',
  OTHERS = 'Others',
  SLUDGE_PIPES = 'Sludge Pipes',
  TRUCK = 'Truck',
}

export enum DocumentEventWeighingCaptureMethod {
  DIGITAL = 'Digital',
  MANUAL = 'Manual',
  PHOTO = 'Photo (Scale + Cargo)',
  TRANSPORT_MANIFEST = 'Transport Manifest',
}

export enum MassIDOrganicSubtype {
  DOMESTIC_SLUDGE = 'Domestic Sludge',
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE = 'EFB similar to Garden, Yard and Park Waste',
  FOOD_FOOD_WASTE_AND_BEVERAGES = 'Food, Food Waste and Beverages',
  GARDEN_YARD_AND_PARK_WASTE = 'Garden, Yard and Park Waste',
  INDUSTRIAL_SLUDGE = 'Industrial Sludge',
  OTHERS_IF_ORGANIC = 'Others (if organic)',
  TOBACCO = 'Tobacco',
  WOOD_AND_WOOD_PRODUCTS = 'Wood and Wood Products',
}

export enum DocumentSubtype {
  DOMESTIC_SLUDGE = MassIDOrganicSubtype.DOMESTIC_SLUDGE,
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE = MassIDOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE,
  FOOD_FOOD_WASTE_AND_BEVERAGES = MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
  GARDEN_YARD_AND_PARK_WASTE = MassIDOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE,
  GROUP = 'Group',
  HAULER = 'Hauler',
  INDUSTRIAL_SLUDGE = MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
  INTEGRATOR = 'Integrator',
  OTHERS_IF_ORGANIC = MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
  PROCESS = 'Process',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  SOURCE = 'Source',
  TCC = 'TCC',
  TOBACCO = MassIDOrganicSubtype.TOBACCO,
  TRC = 'TRC',
  WASTE_GENERATOR = 'Waste Generator',
  WOOD_AND_WOOD_PRODUCTS = MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS,
}

export enum DocumentType {
  CREDIT_ORDER = 'Credit Order',
  DEFINITION = 'Definition',
  GAS_ID = 'GasID',
  MASS_ID_AUDIT = 'MassID Audit',
  ORGANIC = 'Organic',
  PARTICIPANT_ACCREDITATION = 'Participant Accreditation',
  RECYCLED_ID = 'RecycledID',
}

export enum MassIDDocumentActorType {
  HAULER = 'Hauler',
  INTEGRATOR = 'Integrator',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  WASTE_GENERATOR = 'Waste Generator',
}

export enum MeasurementUnit {
  KG = 'kg',
}

export enum MethodologyBaseline {
  LANDFILLS_WITH_FLARING_OF_METHANE_GAS = 'Landfills with flaring of methane gas (and/or capture of biogas)',
  LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS = 'Landfills without flaring of methane gas',
  OPEN_AIR_DUMP = 'Open-air dump',
}

export enum MethodologyDocumentActorType {
  COMMUNITY_IMPACT_POOL = 'Community Impact Pool',
  METHODOLOGY_AUTHOR = 'Methodology Author',
  METHODOLOGY_DEVELOPER = 'Methodology Developer',
  NETWORK = 'Network',
}

export enum ReportType {
  CDF = 'CDF',
  MTR = 'MTR',
}

export const ActorType = {
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
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const DocumentEventLabel = ActorType;
// eslint-disable-next-line no-redeclare, sonarjs/redundant-type-aliases -- intentional: preserves named export used by consumers
export type DocumentEventLabel = ActorType;

export const ApprovedExceptionType = {
  MANDATORY_ATTRIBUTE: 'Exemption for Mandatory Attribute',
} as const;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type ApprovedExceptionType =
  (typeof ApprovedExceptionType)[keyof typeof ApprovedExceptionType];

export const ParticipantType = {
  ACTOR: 'ACTOR',
} as const;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];

export const MassIDLikeDocumentType = {
  GAS_ID: DocumentType.GAS_ID,
  ORGANIC: DocumentType.ORGANIC,
  RECYCLED_ID: DocumentType.RECYCLED_ID,
} as const;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type MassIDLikeDocumentType =
  (typeof MassIDLikeDocumentType)[keyof typeof MassIDLikeDocumentType];
