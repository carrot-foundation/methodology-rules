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

export enum DocumentSubtype {
  AGRO_INDUSTRIAL = 'Agro-industrial',
  ANIMAL_MANURE = 'Animal Manure',
  ANIMAL_WASTE_MANAGEMENT = 'Animal Waste Management',
  DOMESTIC_SLUDGE = 'Domestic Sludge',
  FOOD_WASTE = 'Food Waste',
  GARDEN_AND_PARK_WASTE = 'Garden and Park Waste',
  GROUP = 'Group',
  HAULER = 'Hauler',
  INDUSTRIAL_FOOD_WASTE = 'Industrial Food-Waste',
  INDUSTRIAL_SLUDGE = 'Industrial Sludge',
  OTHER_NON_DANGEROUS_ORGANICS = 'Other Non-Dangerous Organics',
  PROCESS = 'Process',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  SOURCE = 'Source',
  TCC = 'TCC',
  TRC = 'TRC',
  WASTE_GENERATOR = 'Waste Generator',
  WOOD = 'Wood',
  WOOD_AND_WOOD_PRODUCTS = 'Wood and Wood Products',
}

export enum MassIdDocumentActorType {
  HAULER = DocumentSubtype.HAULER,
  PROCESSOR = DocumentSubtype.PROCESSOR,
  RECYCLER = DocumentSubtype.RECYCLER,
  WASTE_GENERATOR = DocumentSubtype.WASTE_GENERATOR,
}

export enum MassSubtype {
  AGRO_INDUSTRIAL = DocumentSubtype.AGRO_INDUSTRIAL,
  ANIMAL_MANURE = DocumentSubtype.ANIMAL_MANURE,
  ANIMAL_WASTE_MANAGEMENT = DocumentSubtype.ANIMAL_WASTE_MANAGEMENT,
  DOMESTIC_SLUDGE = DocumentSubtype.DOMESTIC_SLUDGE,
  FOOD_WASTE = DocumentSubtype.FOOD_WASTE,
  GARDEN_AND_PARK_WASTE = DocumentSubtype.GARDEN_AND_PARK_WASTE,
  INDUSTRIAL_FOOD_WASTE = DocumentSubtype.INDUSTRIAL_FOOD_WASTE,
  INDUSTRIAL_SLUDGE = DocumentSubtype.INDUSTRIAL_SLUDGE,
  OTHER_NON_DANGEROUS_ORGANICS = DocumentSubtype.OTHER_NON_DANGEROUS_ORGANICS,
  WOOD = DocumentSubtype.WOOD,
  WOOD_AND_WOOD_PRODUCTS = DocumentSubtype.WOOD_AND_WOOD_PRODUCTS,
}

export enum MeasurementUnit {
  KG = 'kg',
}

export enum DocumentEventRuleSlug {
  REWARDS_DISTRIBUTION = 'rewards-distribution',
}

export enum DocumentEventAttributeName {
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
  EXEMPTION_JUSTIFICATION = 'Exemption Justification',
  GROSS_WEIGHT = 'Gross Weight',
  HOMOLOGATION_DATE = 'Homologation Date',
  HOMOLOGATION_DUE_DATE = 'Homologation Due Date',
  ISSUE_DATE = 'Issue Date',
  LOCAL_WASTE_CLASSIFICATION_DESC = 'Local Waste Classification Desc',
  LOCAL_WASTE_CLASSIFICATION_ID = 'Local Waste Classification ID',
  MASS_NET_WEIGHT = 'Mass Net Weight',
  METHODOLOGY_SLUG = 'Methodology Slug',
  PROJECT_EMISSION_CALCULATION_INDEX = 'Project Emission Calculation Index',
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
  END = 'END',
  HOMOLOGATION_CONTEXT = MethodologyDocumentEventName.HOMOLOGATION_CONTEXT,
  LINK = MethodologyDocumentEventName.LINK,
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
