import { z } from 'zod';

export const DataSetNameSchema = z.enum(['PROD', 'PROD_SIMULATION', 'TEST']);
export type DataSetName = z.infer<typeof DataSetNameSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const DataSetName = DataSetNameSchema.enum;

export const MethodologyActorTypeSchema = z.enum([
  'Auditor',
  'Community Impact Pool',
  'Hauler',
  'Integrator',
  'Methodology Author',
  'Methodology Developer',
  'Network',
  'Processor',
  'Recycler',
  'Remainder',
  'Source',
  'Waste Generator',
]);
export type MethodologyActorType = z.infer<typeof MethodologyActorTypeSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyActorType = MethodologyActorTypeSchema.enum;

export const MethodologyApprovedExceptionTypeSchema = z.enum([
  'Exemption for Mandatory Attribute',
]);
export type MethodologyApprovedExceptionType = z.infer<
  typeof MethodologyApprovedExceptionTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyApprovedExceptionType =
  MethodologyApprovedExceptionTypeSchema.enum;

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

export const MethodologyDocumentEventLabelSchema = z.enum([
  ...MethodologyActorTypeSchema.options,
]);
export type MethodologyDocumentEventLabel = z.infer<
  typeof MethodologyDocumentEventLabelSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentEventLabel =
  MethodologyDocumentEventLabelSchema.enum;

export const MethodologyDocumentEventNameSchema = z.enum([
  'Accreditation Context',
  'Accreditation Result',
  'ACTOR',
  'CLOSE',
  'Drop-off',
  'Emissions & Composting Metrics',
  'Facility Address',
  'Legal & Administrative Compliance',
  'LINK',
  'Monitoring Systems & Equipment',
  'NOTICE',
  'Onboarding Declaration',
  'OUTPUT',
  'Pick-up',
  'Recycled',
  'Recycling Baseline',
  'Recycling Baselines',
  'Recycling Manifest',
  'RELATED',
  'RULE EXECUTION',
  'RULES METADATA',
  'Sorting',
  'Transport Manifest',
  'Waste Generator',
  'Weighing',
]);
export type MethodologyDocumentEventName = z.infer<
  typeof MethodologyDocumentEventNameSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MethodologyDocumentEventName =
  MethodologyDocumentEventNameSchema.enum;

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
