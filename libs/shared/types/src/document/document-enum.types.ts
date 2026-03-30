import { z } from 'zod';

// --- DataSetName ---

export const DataSetNameSchema = z.enum(['PROD', 'PROD_SIMULATION', 'TEST']);
export type DataSetName = z.infer<typeof DataSetNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DataSetName = DataSetNameSchema.enum;

// --- ActorType (renamed from MethodologyActorType) ---

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

const actorTypeValues = Object.values(ActorType) as [
  (typeof ActorType)[keyof typeof ActorType],
  ...(typeof ActorType)[keyof typeof ActorType][],
];

export const ActorTypeSchema = z.enum(actorTypeValues);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type ActorType = z.infer<typeof ActorTypeSchema>;

// --- ApprovedExceptionType (renamed from MethodologyApprovedExceptionType) ---

export const ApprovedExceptionType = {
  MANDATORY_ATTRIBUTE: 'Exemption for Mandatory Attribute',
} as const;

const approvedExceptionTypeValues = Object.values(ApprovedExceptionType) as [
  (typeof ApprovedExceptionType)[keyof typeof ApprovedExceptionType],
  ...(typeof ApprovedExceptionType)[keyof typeof ApprovedExceptionType][],
];

export const ApprovedExceptionTypeSchema = z.enum(approvedExceptionTypeValues);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type ApprovedExceptionType = z.infer<typeof ApprovedExceptionTypeSchema>;

// --- DocumentEventAttributeFormat (renamed from MethodologyDocumentEventAttributeFormat) ---

export const DocumentEventAttributeFormatSchema = z.enum([
  'CUBIC_METER',
  'DATE',
  'KILOGRAM',
  'LITER',
]);
export type DocumentEventAttributeFormat = z.infer<
  typeof DocumentEventAttributeFormatSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttributeFormat =
  DocumentEventAttributeFormatSchema.enum;

// --- DocumentEventAttributeType (renamed from MethodologyDocumentEventAttributeType) ---

export const DocumentEventAttributeTypeSchema = z.enum(['REFERENCE']);
export type DocumentEventAttributeType = z.infer<
  typeof DocumentEventAttributeTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentEventAttributeType = DocumentEventAttributeTypeSchema.enum;

// --- DocumentEventLabel (renamed from MethodologyDocumentEventLabel) ---
// Event labels use the same values as ActorType — they represent which actor role the event belongs to.

export const DocumentEventLabel = ActorType;
export const DocumentEventLabelSchema = ActorTypeSchema;
// eslint-disable-next-line no-redeclare, sonarjs/redundant-type-aliases -- intentional: preserves named export used by consumers
export type DocumentEventLabel = ActorType;

// --- DocumentEventName (renamed from MethodologyDocumentEventName) ---

export const DocumentEventName = {
  ACCREDITATION_CONTEXT: 'Accreditation Context',
  ACCREDITATION_RESULT: 'Accreditation Result',
  ACTOR: 'ACTOR',
  CLOSE: 'CLOSE',
  DROP_OFF: 'Drop-off',
  EMISSION_AND_COMPOSTING_METRICS: 'Emissions & Composting Metrics',
  FACILITY_ADDRESS: 'Facility Address',
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE: 'Legal & Administrative Compliance',
  LINK: 'LINK',
  MONITORING_SYSTEMS_AND_EQUIPMENT: 'Monitoring Systems & Equipment',
  NOTICE: 'NOTICE',
  ONBOARDING_DECLARATION: 'Onboarding Declaration',
  OUTPUT: 'OUTPUT',
  PICK_UP: 'Pick-up',
  RECYCLED: 'Recycled',
  RECYCLING_BASELINE: 'Recycling Baseline',
  RECYCLING_BASELINES: 'Recycling Baselines',
  RECYCLING_MANIFEST: 'Recycling Manifest',
  RELATED: 'RELATED',
  RULE_EXECUTION: 'RULE EXECUTION',
  RULES_METADATA: 'RULES METADATA',
  SORTING: 'Sorting',
  TRANSPORT_MANIFEST: 'Transport Manifest',
  WASTE_GENERATOR: ActorType.WASTE_GENERATOR,
  WEIGHING: 'Weighing',
} as const;

const documentEventNameValues = Object.values(DocumentEventName) as [
  (typeof DocumentEventName)[keyof typeof DocumentEventName],
  ...(typeof DocumentEventName)[keyof typeof DocumentEventName][],
];

export const DocumentEventNameSchema = z.enum(documentEventNameValues);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type DocumentEventName = z.infer<typeof DocumentEventNameSchema>;

// --- DocumentStatus (renamed from MethodologyDocumentStatus) ---

export const DocumentStatusSchema = z.enum(['CANCELLED', 'CLOSED', 'OPEN']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DocumentStatus = DocumentStatusSchema.enum;

// --- EvaluationResult (renamed from MethodologyEvaluationResult) ---

export const EvaluationResultSchema = z.enum(['PASSED']);
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const EvaluationResult = EvaluationResultSchema.enum;

// --- ParticipantType (renamed from MethodologyParticipantType) ---

export const ParticipantTypeSchema = z.enum(['ACTOR']);
export type ParticipantType = z.infer<typeof ParticipantTypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const ParticipantType = ParticipantTypeSchema.enum;

// --- DocumentType (promoted from Bold enum.types.ts to shared layer) ---

export const DocumentType = {
  CREDIT_ORDER: 'Credit Order',
  DEFINITION: 'Definition',
  GAS_ID: 'GasID',
  MASS_ID_AUDIT: 'MassID Audit',
  ORGANIC: 'Organic',
  PARTICIPANT_ACCREDITATION: 'Participant Accreditation',
  RECYCLED_ID: 'RecycledID',
} as const;

const documentTypeValues = Object.values(DocumentType) as [
  (typeof DocumentType)[keyof typeof DocumentType],
  ...(typeof DocumentType)[keyof typeof DocumentType][],
];

export const DocumentTypeSchema = z.enum(documentTypeValues);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const MassIDLikeDocumentTypeSchema = DocumentTypeSchema.extract([
  DocumentType.ORGANIC,
  DocumentType.GAS_ID,
  DocumentType.RECYCLED_ID,
]);
export type MassIDLikeDocumentType = z.infer<
  typeof MassIDLikeDocumentTypeSchema
>;
