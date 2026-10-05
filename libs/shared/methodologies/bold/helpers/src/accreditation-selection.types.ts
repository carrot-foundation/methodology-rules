import {
  BoldActorTypeSchema,
  type BoldDocument,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DateTimeSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const ACCREDITATION_HISTORY_EVENT = 'Accreditation Revision';
export const ACCREDITATION_HISTORY_ATTRIBUTE = 'Accreditation History';
export const ACCREDITATION_EVALUATION_EVENT = 'Accreditation Evaluation';
export const ACCREDITATION_EVALUATION_ATTRIBUTE = 'Accreditation Evaluation';

export const AccreditationRoleSchema = BoldActorTypeSchema.extract([
  'Recycler',
  'Processor',
  'Auditor',
  'Integrator',
  'Waste Generator',
  'Hauler',
]);
export type AccreditationRole = z.infer<typeof AccreditationRoleSchema>;

export const AccreditationDateSchema = z.union([DateTimeSchema, z.iso.date()]);

export const AccreditationHistorySchema = z
  .strictObject({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    disposition: z.enum(['APPROVED', 'REJECTED', 'REVOKED']),
    effectiveFrom: z.iso.date(),
    predecessorRevisionId: z.uuid().optional(),
    revision: z.number().int().positive(),
    revisionId: z.uuid(),
    schemaVersion: z.literal('1.0.0'),
    scope: z.strictObject({
      cycleId: NonEmptyStringSchema,
      facilityId: NonEmptyStringSchema.nullable(),
      methodologyId: z.uuid(),
      methodologyVersion: NonEmptyStringSchema,
      participantId: NonEmptyStringSchema,
      role: AccreditationRoleSchema,
    }),
    supersedesRevisionId: z.uuid().optional(),
  })
  .refine(
    (history) =>
      history.scope.facilityId !== null ||
      ['Auditor', 'Hauler', 'Integrator'].includes(history.scope.role),
  )
  .refine(
    (history) =>
      history.disposition !== 'REJECTED' ||
      history.supersedesRevisionId === undefined,
  )
  .refine(
    (history) =>
      history.disposition !== 'REVOKED' ||
      history.supersedesRevisionId !== undefined,
  );
export type AccreditationHistory = z.infer<typeof AccreditationHistorySchema>;

export const AccreditationEvaluationSchema = z.strictObject({
  evaluationDate: DateTimeSchema,
  methodologyId: z.uuid(),
  methodologyVersion: NonEmptyStringSchema,
  schemaVersion: z.literal('1.0.0'),
});
export interface AccreditationCandidate {
  document: BoldDocument;
  history: AccreditationHistory | undefined;
}

export type AccreditationEvaluation = z.infer<
  typeof AccreditationEvaluationSchema
>;

export type AccreditationEvaluationContext = Pick<
  AccreditationSelectionInput,
  'evaluationDate' | 'methodologyId' | 'methodologyVersion'
>;

export type AccreditationSelectionFailureStatus =
  | 'AMBIGUOUS'
  | 'INACTIVE'
  | 'MALFORMED'
  | 'MISSING'
  | 'REJECTED'
  | 'REVOKED';

export interface AccreditationSelectionInput {
  accreditationDocuments: readonly BoldDocument[];
  evaluationDate: string;
  facilityId: null | string;
  methodologyId: string | undefined;
  methodologyVersion: string | undefined;
  participantId: string;
  role: AccreditationRole;
}

export type AccreditationSelectionResult =
  | { document: BoldDocument; status: 'SELECTED' }
  | { reason: string; status: AccreditationSelectionFailureStatus };
