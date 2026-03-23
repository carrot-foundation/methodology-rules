import { z } from 'zod';

export const DataSetNameSchema = z.enum(['PROD', 'PROD_SIMULATION', 'TEST']);
export type DataSetName = z.infer<typeof DataSetNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DataSetName = DataSetNameSchema.enum;

export enum MethodologyActorType {
  AUDITOR = 'Auditor',
  COMMUNITY_IMPACT_POOL = 'Community Impact Pool',
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

export enum MethodologyApprovedExceptionType {
  MANDATORY_ATTRIBUTE = 'Exemption for Mandatory Attribute',
}

export const MethodologyDocumentEventAttributeFormatSchema = z.enum([
  'CUBIC_METER',
  'DATE',
  'KILOGRAM',
  'LITER',
]);
export type MethodologyDocumentEventAttributeFormat = z.infer<
  typeof MethodologyDocumentEventAttributeFormatSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentEventAttributeFormat =
  MethodologyDocumentEventAttributeFormatSchema.enum;

export const MethodologyDocumentEventAttributeTypeSchema = z.enum([
  'REFERENCE',
]);
export type MethodologyDocumentEventAttributeType = z.infer<
  typeof MethodologyDocumentEventAttributeTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentEventAttributeType =
  MethodologyDocumentEventAttributeTypeSchema.enum;

export enum MethodologyDocumentEventLabel {
  AUDITOR = MethodologyActorType.AUDITOR,
  COMMUNITY_IMPACT_POOL = MethodologyActorType.COMMUNITY_IMPACT_POOL,
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

export enum MethodologyDocumentEventName {
  ACCREDITATION_CONTEXT = 'Accreditation Context',
  ACCREDITATION_RESULT = 'Accreditation Result',
  ACTOR = 'ACTOR',
  CLOSE = 'CLOSE',
  DROP_OFF = 'Drop-off',
  EMISSION_AND_COMPOSTING_METRICS = 'Emissions & Composting Metrics',
  FACILITY_ADDRESS = 'Facility Address',
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE = 'Legal & Administrative Compliance',
  LINK = 'LINK',
  MONITORING_SYSTEMS_AND_EQUIPMENT = 'Monitoring Systems & Equipment',
  NOTICE = 'NOTICE',
  ONBOARDING_DECLARATION = 'Onboarding Declaration',
  OUTPUT = 'OUTPUT',
  PICK_UP = 'Pick-up',
  RECYCLED = 'Recycled',
  RECYCLING_BASELINE = 'Recycling Baseline',
  RECYCLING_BASELINES = 'Recycling Baselines',
  RECYCLING_MANIFEST = 'Recycling Manifest',
  RELATED = 'RELATED',
  RULE_EXECUTION = 'RULE EXECUTION',
  RULES_METADATA = 'RULES METADATA',
  SORTING = 'Sorting',
  TRANSPORT_MANIFEST = 'Transport Manifest',
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
  WEIGHING = 'Weighing',
}

export const MethodologyDocumentStatusSchema = z.enum([
  'CANCELLED',
  'CLOSED',
  'OPEN',
]);
export type MethodologyDocumentStatus = z.infer<
  typeof MethodologyDocumentStatusSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentStatus = MethodologyDocumentStatusSchema.enum;

export const MethodologyEvaluationResultSchema = z.enum(['PASSED']);
export type MethodologyEvaluationResult = z.infer<
  typeof MethodologyEvaluationResultSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyEvaluationResult =
  MethodologyEvaluationResultSchema.enum;

export const MethodologyParticipantTypeSchema = z.enum(['ACTOR']);
export type MethodologyParticipantType = z.infer<
  typeof MethodologyParticipantTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyParticipantType = MethodologyParticipantTypeSchema.enum;
