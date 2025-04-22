import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

export enum DocumentCategory {
  MASS_ID = 'MassID',
  METHODOLOGY = 'Methodology',
}

export enum DocumentStatus {
  CANCELLED = 'CANCELLED',
  OPEN = 'OPEN',
}

export enum DocumentType {
  CREDIT = 'Credit',
  DEFINITION = 'Definition',
  GAS_ID = 'GasID',
  MASS_ID_AUDIT = 'MassID Audit',
  ORGANIC = 'Organic',
  PARTICIPANT_HOMOLOGATION = 'Participant Homologation',
  RECYCLED_ID = 'RecycledID',
}

export enum MassIdSubtype {
  DOMESTIC_SLUDGE = 'Domestic Sludge',
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE = 'EFB similar to Garden, Yard and Park Waste',
  FOOD_FOOD_WASTE_AND_BEVERAGES = 'Food, Food Waste and Beverages',
  GARDEN_YARD_AND_PARK_WASTE = 'Garden, Yard and Park Waste',
  GLASS_PLASTIC_METAL_OTHER_INERT_WASTE = 'Glass, Plastic, Metal, Other Inert Waste',
  INDUSTRIAL_SLUDGE = 'Industrial Sludge',
  OTHERS = 'Others',
  PULP_PAPER_AND_CARDBOARD = 'Pulp, Paper and Cardboard',
  TEXTILES = 'Textiles',
  TOBACCO = 'Tobacco',
  WOOD_AND_WOOD_PRODUCTS = 'Wood and Wood Products',
}

export enum DocumentSubtype {
  DOMESTIC_SLUDGE = MassIdSubtype.DOMESTIC_SLUDGE,
  EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE = MassIdSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE,
  FOOD_FOOD_WASTE_AND_BEVERAGES = MassIdSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
  GARDEN_YARD_AND_PARK_WASTE = MassIdSubtype.GARDEN_YARD_AND_PARK_WASTE,
  GLASS_PLASTIC_METAL_OTHER_INERT_WASTE = MassIdSubtype.GLASS_PLASTIC_METAL_OTHER_INERT_WASTE,
  GROUP = 'Group',
  HAULER = 'Hauler',
  INDUSTRIAL_SLUDGE = MassIdSubtype.INDUSTRIAL_SLUDGE,
  OTHERS = MassIdSubtype.OTHERS,
  PROCESS = 'Process',
  PROCESSOR = 'Processor',
  PULP_PAPER_AND_CARDBOARD = MassIdSubtype.PULP_PAPER_AND_CARDBOARD,
  RECYCLER = 'Recycler',
  SOURCE = 'Source',
  TCC = 'TCC',
  TEXTILES = MassIdSubtype.TEXTILES,
  TOBACCO = MassIdSubtype.TOBACCO,
  TRC = 'TRC',
  WASTE_GENERATOR = 'Waste Generator',
  WOOD_AND_WOOD_PRODUCTS = MassIdSubtype.WOOD_AND_WOOD_PRODUCTS,
}

export enum MassIdDocumentActorType {
  HAULER = DocumentSubtype.HAULER,
  PROCESSOR = DocumentSubtype.PROCESSOR,
  RECYCLER = DocumentSubtype.RECYCLER,
  WASTE_GENERATOR = DocumentSubtype.WASTE_GENERATOR,
}

export enum MeasurementUnit {
  KG = 'kg',
}

export enum DocumentEventRuleSlug {
  REWARDS_DISTRIBUTION = 'rewards-distribution',
}

export enum DocumentEventAttributeName {
  APPROVED_EXCEPTIONS = 'Approved Exceptions',
  CAPTURED_GPS_LATITUDE = 'Captured GPS Latitude',
  CAPTURED_GPS_LONGITUDE = 'Captured GPS Longitude',
  CONTAINER_CAPACITY = 'Container Capacity',
  CONTAINER_QUANTITY = 'Container Quantity',
  CONTAINER_TYPE = 'Container Type',
  DESCRIPTION = 'Description',
  DOCUMENT_NUMBER = 'Document Number',
  DOCUMENT_TYPE = 'Document Type',
  DRIVER_IDENTIFIER = 'Driver Identifier',
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION = 'Driver Identifier Exemption Justification',
  EFFECTIVE_DATE = 'Effective Date',
  EMISSION_FACTOR = 'Emission Factor',
  EXEMPTION_JUSTIFICATION = 'Exemption Justification',
  EXPIRATION_DATE = 'Expiration Date',
  GROSS_WEIGHT = 'Gross Weight',
  HOMOLOGATION_STATUS = 'Homologation Status',
  ISSUE_DATE = 'Issue Date',
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION = 'Local Waste Classification Description',
  LOCAL_WASTE_CLASSIFICATION_ID = 'Local Waste Classification ID',
  METHODOLOGY_SLUG = 'Methodology Slug',
  RECEIVING_OPERATOR_IDENTIFIER = 'Receiving Operator Identifier',
  RECYCLER_OPERATOR_IDENTIFIER = 'Recycler Operator Identifier',
  SCALE_HOMOLOGATION = 'Scale Homologation',
  SCALE_TYPE = 'Scale Type',
  SORTING_FACTOR = 'Sorting Factor',
  TARE = 'Tare',
  VEHICLE_DESCRIPTION = 'Vehicle Description',
  VEHICLE_LICENSE_PLATE = 'Vehicle License Plate',
  VEHICLE_TYPE = 'Vehicle Type',
  WASTE_ORIGIN = 'Waste Origin',
  WEIGHING_CAPTURE_METHOD = 'Weighing Capture Method',
}

export enum DocumentEventAttributeValue {
  UNIDENTIFIED = 'Unidentified',
}

export enum ReportType {
  CDF = 'CDF',
  MTR = 'MTR',
}

export enum DocumentEventAttachmentLabel {
  RECYCLING_MANIFEST = 'Recycling Manifest',
  TRANSPORT_MANIFEST = 'Transport Manifest',
}

export enum DocumentEventName {
  ACTOR = MethodologyDocumentEventName.ACTOR,
  CLOSE = MethodologyDocumentEventName.CLOSE,
  DROP_OFF = MethodologyDocumentEventName.DROP_OFF,
  EMISSION_AND_COMPOSTING_METRICS = MethodologyDocumentEventName.EMISSION_AND_COMPOSTING_METRICS,
  END = 'END',
  HOMOLOGATION_CONTEXT = MethodologyDocumentEventName.HOMOLOGATION_CONTEXT,
  HOMOLOGATION_RESULT = MethodologyDocumentEventName.HOMOLOGATION_RESULT,
  LINK = MethodologyDocumentEventName.LINK,
  MONITORING_SYSTEMS_AND_EQUIPMENT = MethodologyDocumentEventName.MONITORING_SYSTEMS_AND_EQUIPMENT,
  MOVE = 'MOVE',
  NOTICE = MethodologyDocumentEventName.NOTICE,
  OUTPUT = MethodologyDocumentEventName.OUTPUT,
  PICK_UP = MethodologyDocumentEventName.PICK_UP,
  RECYCLED = MethodologyDocumentEventName.RECYCLED,
  RECYCLING_MANIFEST = MethodologyDocumentEventName.RECYCLING_MANIFEST,
  RELATED = MethodologyDocumentEventName.RELATED,
  RULE_EXECUTION = MethodologyDocumentEventName.RULE_EXECUTION,
  RULES_METADATA = MethodologyDocumentEventName.RULES_METADATA,
  SORTING = MethodologyDocumentEventName.SORTING,
  TRANSPORT_MANIFEST = MethodologyDocumentEventName.TRANSPORT_MANIFEST,
  WASTE_GENERATOR = MethodologyDocumentEventName.WASTE_GENERATOR,
  WEIGHING = MethodologyDocumentEventName.WEIGHING,
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

export enum DocumentEventContainerType {
  BAG = 'Bag',
  BIN = 'Bin',
  DRUM = 'Drum',
  PAIL = 'Pail',
  STREET_BIN = 'Street Bin',
  TRUCK = 'Truck',
  WASTE_BOX = 'Waste Box',
}

export enum DocumentEventHomologationStatus {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}
