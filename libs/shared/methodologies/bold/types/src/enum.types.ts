import {
  MethodologyActorType,
  MethodologyDocumentEventName,
} from '@carrot-fndn/shared/types';

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
  ACCREDITATION_CONTEXT = MethodologyDocumentEventName.ACCREDITATION_CONTEXT,
  ACCREDITATION_RESULT = MethodologyDocumentEventName.ACCREDITATION_RESULT,
  ACTOR = MethodologyDocumentEventName.ACTOR,
  CLOSE = MethodologyDocumentEventName.CLOSE,
  DROP_OFF = MethodologyDocumentEventName.DROP_OFF,
  EMISSION_AND_COMPOSTING_METRICS = MethodologyDocumentEventName.EMISSION_AND_COMPOSTING_METRICS,
  END = 'END',
  FACILITY_ADDRESS = MethodologyDocumentEventName.FACILITY_ADDRESS,
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE = MethodologyDocumentEventName.LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
  LINK = MethodologyDocumentEventName.LINK,
  MONITORING_SYSTEMS_AND_EQUIPMENT = MethodologyDocumentEventName.MONITORING_SYSTEMS_AND_EQUIPMENT,
  MOVE = 'MOVE',
  NOTICE = MethodologyDocumentEventName.NOTICE,
  ONBOARDING_DECLARATION = MethodologyDocumentEventName.ONBOARDING_DECLARATION,
  OUTPUT = MethodologyDocumentEventName.OUTPUT,
  PICK_UP = MethodologyDocumentEventName.PICK_UP,
  RECYCLED = MethodologyDocumentEventName.RECYCLED,
  RECYCLING_BASELINES = MethodologyDocumentEventName.RECYCLING_BASELINES,
  RECYCLING_MANIFEST = MethodologyDocumentEventName.RECYCLING_MANIFEST,
  RELATED = MethodologyDocumentEventName.RELATED,
  RULE_EXECUTION = MethodologyDocumentEventName.RULE_EXECUTION,
  RULES_METADATA = MethodologyDocumentEventName.RULES_METADATA,
  SORTING = MethodologyDocumentEventName.SORTING,
  TRANSPORT_MANIFEST = MethodologyDocumentEventName.TRANSPORT_MANIFEST,
  WASTE_GENERATOR = MethodologyDocumentEventName.WASTE_GENERATOR,
  WEIGHING = MethodologyDocumentEventName.WEIGHING,
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
  TOBACCO = 'Tobacco',
  WOOD_AND_WOOD_PRODUCTS = 'Wood and Wood Products',
}

export enum DocumentSubtype {
  DOMESTIC_SLUDGE = MassIDOrganicSubtype.DOMESTIC_SLUDGE,
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE = MassIDOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE,
  FOOD_FOOD_WASTE_AND_BEVERAGES = MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
  GARDEN_YARD_AND_PARK_WASTE = MassIDOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE,
  GROUP = 'Group',
  HAULER = MethodologyActorType.HAULER,
  INDUSTRIAL_SLUDGE = MassIDOrganicSubtype.INDUSTRIAL_SLUDGE,
  INTEGRATOR = MethodologyActorType.INTEGRATOR,
  PROCESS = 'Process',
  PROCESSOR = MethodologyActorType.PROCESSOR,
  RECYCLER = MethodologyActorType.RECYCLER,
  SOURCE = 'Source',
  TCC = 'TCC',
  TOBACCO = MassIDOrganicSubtype.TOBACCO,
  TRC = 'TRC',
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
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
  HAULER = MethodologyActorType.HAULER,
  INTEGRATOR = MethodologyActorType.INTEGRATOR,
  PROCESSOR = MethodologyActorType.PROCESSOR,
  RECYCLER = MethodologyActorType.RECYCLER,
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
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
  COMMUNITY_IMPACT_POOL = MethodologyActorType.COMMUNITY_IMPACT_POOL,
  METHODOLOGY_AUTHOR = MethodologyActorType.METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER = MethodologyActorType.METHODOLOGY_DEVELOPER,
  NETWORK = MethodologyActorType.NETWORK,
}

export enum ReportType {
  CDF = 'CDF',
  MTR = 'MTR',
}
