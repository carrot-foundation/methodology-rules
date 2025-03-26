import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

export enum DocumentCategory {
  MASS = 'Mass',
  MASS_ID = 'MassID',
  METHODOLOGY = 'Methodology',
}

export enum DocumentStatus {
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  CREDIT = 'Credit',
  CREDIT_CERTIFICATES = 'Credit Certificates',
  DEFINITION = 'Definition',
  MASS_AUDIT = 'Mass Audit',
  MASS_CERTIFICATE = 'Mass Certificate',
  MASS_CERTIFICATE_AUDIT = 'Mass Certificate Audit',
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

// TODO: Remove this enum after finish the rules development
export enum MeasurementUnit {
  KG = 'KG',
}

// TODO: Rename this enum after finish the rules development
export enum NewMeasurementUnit {
  KG = 'kg',
}

export enum DocumentEventRuleSlug {
  REWARDS_DISTRIBUTION = 'rewards-distribution',
}

// TODO: rename to DocumentEventAttributeName when all rule processors are implemented
export enum NewDocumentEventAttributeName {
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

export enum DocumentEventAttributeName {
  ACTOR_TYPE = 'actor-type',
  APP_GPS_LATITUDE = 'app-gps-latitude',
  APP_GPS_LONGITUDE = 'app-gps-longitude',
  COLLECTION_NAME = 'collection-name',
  DESCRIPTION = 'description',
  DRIVER_INTERNAL_ID = 'driver-internal-id',
  EVENT_VALUE = 'event-value',
  HAS_CDF = 'has-cdf',
  HAS_MTR = 'has-mtr',
  HAS_REASON_DISMISSAL_CDF = 'has-reason-dismissal-cdf',
  HAS_REASON_DISMISSAL_MTR = 'has-reason-dismissal-mtr',
  HOMOLOGATION_DATE = 'homologation-date',
  HOMOLOGATION_DUE_DATE = 'homologation-due-date',
  INVOICE_COUNTRY = 'invoice-country',
  INVOICE_COUNTRY_CITY = 'invoice-country-city',
  INVOICE_COUNTRY_STATE = 'invoice-country-state',
  INVOICE_DATE = 'invoice-date',
  INVOICE_KEY = 'invoice-key',
  INVOICE_NEIGHBORHOOD = 'invoice-neighborhood',
  INVOICE_NUMBER = 'invoice-number',
  INVOICE_TOTAL_WEIGHT = 'invoice-total-weight',
  INVOICE_WEIGHT_MASSID_ASSOCIATED = 'invoice-weight-massid-associated',
  LOAD_NET_WEIGHT = 'load-net-weight',
  LPR_SOFTWARE = 'lpr-software',
  LPR_SUPPLIER = 'lpr-supplier',
  METHODOLOGY_DESCRIPTION = 'methodology-description',
  METHODOLOGY_EVALUATION_RESULT = 'methodology-evaluation-result',
  METHODOLOGY_NAME = 'methodology-name',
  METHODOLOGY_SLUG = 'methodology-slug',
  MOVE_TYPE = 'move-type',
  NFT_DESCRIPTION = 'nft-description',
  NFT_IMAGE = 'nft-image',
  REPORT_DATE_ISSUED = 'report-date-issued',
  REPORT_NUMBER = 'report-number',
  REPORT_TYPE = 'report-type',
  RULE_NAME = 'rule-name',
  RULE_PROCESSOR_CODE_VERSION = 'rule-processor-source-code-version',
  RULE_PROCESSOR_RESULT_CONTENT = 'rule-processor-result-content',
  RULE_PROCESSOR_SOURCE_CODE_URL = 'rule-processor-source-code-url',
  RULE_SLUG = 'rule-slug',
  STORE_CONTRACT_ADDRESS = 'store-contract-address',
  UNIT_PRICE = 'unit-price',
  VEHICLE_DESCRIPTION = 'vehicle-description',
  VEHICLE_GROSS_WEIGHT = 'vehicle-gross-weight',
  VEHICLE_LICENSE_PLATE = 'vehicle-license-plate',
  VEHICLE_TYPE = 'vehicle-type',
  VEHICLE_VOLUME_CAPACITY = 'vehicle-volume-capacity',
  VEHICLE_WEIGHT = 'vehicle-weight',
  WASTE_ORIGIN_IDENTIFIED = 'waste-origin-identified',
  WEIGHT_SCALE_MANUFACTURER = 'weight-scale-manufacturer',
  WEIGHT_SCALE_MODEL = 'weight-scale-model',
  WEIGHT_SCALE_SOFTWARE = 'weight-scale-software',
  WEIGHT_SCALE_SUPPLIER = 'weight-scale-supplier',
  WEIGHT_SCALE_TYPE = 'weight-scale-type',
}

export enum DocumentEventAttributeValue {
  UNIDENTIFIED = 'Unidentified',
}

export enum ReportType {
  CDF = 'CDF',
  MTR = 'MTR',
}

export enum ReportTypeLiteralName {
  CDF = 'CERTIFICADO DE DESTINAÇÃO FINAL',
  MTR = 'MANIFESTO DE TRANSPORTE DE RESÍDUOS',
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
  LINK = MethodologyDocumentEventName.LINK,
  MOVE = 'MOVE',
  NOTICE = MethodologyDocumentEventName.NOTICE,
  OPEN = MethodologyDocumentEventName.OPEN,
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

export enum DocumentEventActorType {
  APPOINTED_NGO = 'APPOINTED NGO',
  AUDITOR = 'AUDITOR',
  HAULER = 'HAULER',
  INTEGRATOR = 'INTEGRATOR',
  METHODOLOGY_AUTHOR = 'METHODOLOGY AUTHOR',
  METHODOLOGY_DEVELOPER = 'METHODOLOGY DEVELOPER',
  NETWORK = 'NETWORK',
  PROCESSOR = 'PROCESSOR',
  RECYCLER = 'RECYCLER',
  REMAINDER = 'REMAINDER',
  SOURCE = 'SOURCE',
}

export enum DocumentEventMoveType {
  DROP_OFF = 'Drop-off',
  PICK_UP = 'Pick-up',
  SHIPMENT_REQUEST = 'Shipment-request',
  WEIGHING = 'Weighing',
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
