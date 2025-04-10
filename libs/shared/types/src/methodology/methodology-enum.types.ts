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
  EMISSION_AND_COMPOSTING_METRICS = 'Emissions & Composting Metrics',
  HOMOLOGATION_CONTEXT = 'Homologation Context',
  HOMOLOGATION_RESULT = 'Homologation Result',
  LINK = 'LINK',
  MONITORING_SYSTEMS_AND_EQUIPMENT = 'Monitoring Systems & Equipment',
  NOTICE = 'NOTICE',
  OUTPUT = 'OUTPUT',
  PICK_UP = 'Pick-up',
  RECYCLED = 'Recycled',
  RECYCLING_MANIFEST = 'Recycling Manifest',
  RELATED = 'RELATED',
  RULE_EXECUTION = 'RULE EXECUTION',
  RULES_METADATA = 'RULES METADATA',
  SORTING = 'Sorting',
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
