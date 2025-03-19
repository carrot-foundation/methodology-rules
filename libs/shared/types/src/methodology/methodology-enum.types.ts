export enum DataSetName {
  PROD = 'PROD',
  PROD_SIMULATION = 'PROD_SIMULATION',
  TEST = 'TEST',
}

export enum MethodologyParticipantType {
  ACTOR = 'ACTOR',
}

export enum MethodologyDocumentEventLabel {
  HAULER = 'Hauler',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  WASTE_GENERATOR = 'Waste Generator',
}

export enum MethodologyDocumentEventName {
  ACTOR = 'ACTOR',
  CLOSE = 'CLOSE',
  DROP_OFF = 'Drop-off',
  LINK = 'LINK',
  NOTICE = 'NOTICE',
  OPEN = 'OPEN',
  OUTPUT = 'OUTPUT',
  PICK_UP = 'Pick-up',
  RECYCLED = 'Recycled',
  RECYCLING_MANIFEST = 'Recycling Manifest',
  RELATED = 'RELATED',
  RULE_EXECUTION = 'RULE EXECUTION',
  RULES_METADATA = 'RULES METADATA',
  TRANSPORT_MANIFEST = 'Transport Manifest',
  WASTE_GENERATOR = 'Waste Generator',
  WEIGHING = 'Weighing',
}

export enum MethodologyEvaluationResult {
  APPROVED = 'APPROVED',
}

export enum MethodologyDocumentEventAttributeFormat {
  CUBIC_METER = 'CUBIC_METER',
  DATE = 'DATE',
  KILOGRAM = 'KILOGRAM',
  LITER = 'LITER',
}

export enum MethodologyDocumentEventAttributeType {
  REFERENCE = 'REFERENCE',
}
