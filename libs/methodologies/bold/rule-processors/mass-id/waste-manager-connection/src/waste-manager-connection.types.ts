import type { MassIDConnectionEvidenceLoadResult } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

export interface WasteManagerConnectionInput {
  connectionEvidence: MassIDConnectionEvidenceLoadResult;
  executionDocumentId: string;
  massIDDocument: BoldDocument;
}

export interface WasteManagerConnectionRuleSubject {
  connectionEvidence: MassIDConnectionEvidenceLoadResult;
  dropOffDate: string | undefined;
  executionDocumentId: string;
  massIDDocumentId: string;
  wasteGeneratorParticipantId: string | undefined;
  wasteManagerParticipantIds: string[];
}

export interface WasteManagerDecision {
  decision: 'approved' | 'excluded' | 'review';
  origin: 'connection' | 'declared';
  palantirParticipantId: string;
  reason: string;
}
