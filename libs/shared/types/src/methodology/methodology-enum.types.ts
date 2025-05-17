export enum DataSetName {
  PROD = 'PROD',
  PROD_SIMULATION = 'PROD_SIMULATION',
  TEST = 'TEST',
}

export enum MethodologyParticipantType {
  ACTOR = 'ACTOR',
}

export enum MethodologyActorType {
  APPOINTED_NGO = 'Appointed NGO',
  AUDITOR = 'Auditor',
  HAULER = 'Hauler',
  INTEGRATOR = 'Integrator',
  METHODOLOGY_AUTHOR = 'Methodology Author',
  METHODOLOGY_DEVELOPER = 'Methodology Developer',
  NETWORK = 'Network',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  REMAINDER = 'Remainder',
  SOURCE = 'Source',
  WASTE_GENERATOR = 'Waste Generator',
}

export enum MethodologyDocumentEventLabel {
  APPOINTED_NGO = MethodologyActorType.APPOINTED_NGO,
  AUDITOR = MethodologyActorType.AUDITOR,
  HAULER = MethodologyActorType.HAULER,
  INTEGRATOR = MethodologyActorType.INTEGRATOR,
  METHODOLOGY_AUTHOR = MethodologyActorType.METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER = MethodologyActorType.METHODOLOGY_DEVELOPER,
  NETWORK = MethodologyActorType.NETWORK,
  PROCESSOR = MethodologyActorType.PROCESSOR,
  RECYCLER = MethodologyActorType.RECYCLER,
  REMAINDER = MethodologyActorType.REMAINDER,
  SOURCE = MethodologyActorType.SOURCE,
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
}

export enum MethodologyApprovedExceptionType {
  MANDATORY_ATTRIBUTE = 'Exemption for Mandatory Attribute',
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
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
  WEIGHING = 'Weighing',
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

export enum MethodologyDocumentStatus {
  CANCELLED = 'CANCELLED',
  OPEN = 'OPEN',
}
