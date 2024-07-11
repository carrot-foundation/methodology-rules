export enum ParticipantType {
  ACTOR = 'ACTOR',
}

export enum DocumentCategory {
  MASS = 'Mass',
  METHODOLOGY = 'Methodology',
}

export enum DataSetName {
  PROD = 'PROD',
  PROD_SIMULATION = 'PROD_SIMULATION',
  TEST = 'TEST',
}

export enum DocumentType {
  CERTIFICATE = 'Certificate',
  CERTIFICATE_AUDIT = 'Certificate Audit',
  CREDIT = 'Credit',
  CREDIT_CERTIFICATES = 'Credit Certificates',
  DEFINITION = 'Definition',
  MASS_VALIDATION = 'Mass Validation',
  ORGANIC = 'Organic',
  PARTICIPANT_HOMOLOGATION = 'Participant Homologation',
}

export enum DocumentSubtype {
  AGRO_INDUSTRIAL = 'Agro-industrial',
  ANIMAL_MANURE = 'Animal Manure',
  ANIMAL_WASTE_MANAGEMENT = 'Animal Waste Management',
  DOMESTIC_SLUDGE = 'Domestic Sludge',
  FOOD_WASTE = 'Food Waste',
  GARDEN_AND_PARK_WASTE = 'Garden and Park Waste',
  GROUP = 'Group',
  INDUSTRIAL_FOOD_WASTE = 'Industrial Food-Waste',
  INDUSTRIAL_SLUDGE = 'Industrial Sludge',
  OTHER_NON_DANGEROUS_ORGANICS = 'Other Non-Dangerous Organics',
  PROCESS = 'Process',
  RECYCLER = 'Recycler',
  SOURCE = 'Source',
  WOOD = 'Wood',
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
}

export enum MeasurementUnit {
  KG = 'KG',
}

export enum DocumentEventRuleSlug {
  REWARDS_DISTRIBUTION = 'rewards-distribution',
}

export enum DocumentEventName {
  ACTOR = 'ACTOR',
  CLOSE = 'CLOSE',
  END = 'END',
  LINK = 'LINK',
  MOVE = 'MOVE',
  OPEN = 'OPEN',
  OUTPUT = 'OUTPUT',
  RELATED = 'RELATED',
  RULE_EXECUTION = 'RULE EXECUTION',
}

export enum DocumentEventAttributeName {
  ACTOR_TYPE = 'actor-type',
  APP_GPS_LATITUDE = 'app-gps-latitude',
  APP_GPS_LONGITUDE = 'app-gps-longitude',
  CERTIFICATE_VALUE_LABEL = 'certificate-value-label',
  DRIVER_INTERNAL_ID = 'driver-internal-id',
  EVENT_VALUE = 'event-value',
  HAS_CDF = 'has-cdf',
  HAS_MTR = 'has-mtr',
  HAS_REASON_DISMISSAL_CDF = 'has-reason-dismissal-cdf',
  HAS_REASON_DISMISSAL_MTR = 'has-reason-dismissal-mtr',
  HOMOLOGATION_DUE_DATE = 'homologation-due-date',
  INVOICE_COUNTRY = 'invoice-country',
  INVOICE_COUNTRY_CITY = 'invoice-country-city',
  INVOICE_COUNTRY_STATE = 'invoice-country-state',
  INVOICE_DATE = 'invoice-date',
  INVOICE_KEY = 'invoice-key',
  INVOICE_NEIGHBORHOOD = 'invoice-neighborhood',
  INVOICE_NUMBER = 'invoice-number',
  LOAD_NET_WEIGHT = 'load-net-weight',
  METHODOLOGY_DESCRIPTION = 'methodology-description',
  METHODOLOGY_EVALUATION_RESULT = 'methodology-evaluation-result',
  METHODOLOGY_NAME = 'methodology-name',
  METHODOLOGY_SLUG = 'methodology-slug',
  MOVE_TYPE = 'move-type',
  REPORT_DATE_ISSUED = 'report-date-issued',
  REPORT_NUMBER = 'report-number',
  REPORT_TYPE = 'report-type',
  RULE_NAME = 'rule-name',
  RULE_PROCESSOR_CODE_VERSION = 'rule-processor-source-code-version',
  RULE_PROCESSOR_RESULT_CONTENT = 'rule-processor-result-content',
  RULE_PROCESSOR_SOURCE_CODE_URL = 'rule-processor-source-code-url',
  RULE_SLUG = 'rule-slug',
  UNIT_PRICE = 'unit-price',
  VEHICLE_DESCRIPTION = 'vehicle-description',
  VEHICLE_GROSS_WEIGHT = 'vehicle-gross-weight',
  VEHICLE_LICENSE_PLATE = 'vehicle-license-plate',
  VEHICLE_TYPE = 'vehicle-type',
  VEHICLE_WEIGHT = 'vehicle-weight',
  WASTE_ORIGIN_IDENTIFIED = 'waste-origin-identified',
  WEIGHT_SCALE_MANUFACTURER = 'weight-scale-manufacturer',
  WEIGHT_SCALE_MODEL = 'weight-scale-model',
  WEIGHT_SCALE_SOFTWARE = 'weight-scale-software',
  WEIGHT_SCALE_SUPPLIER = 'weight-scale-supplier',
  WEIGHT_SCALE_TYPE = 'weight-scale-type',
}

export enum ReportType {
  CDF = 'CDF',
  MTR = 'MTR',
}

export enum ReportTypeLiteralName {
  CDF = 'CERTIFICADO DE DESTINAÇÃO FINAL',
  MTR = 'MANIFESTO DE TRANSPORTE DE RESÍDUOS',
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

export enum MethodologyEvaluationResult {
  APPROVED = 'APPROVED',
}
