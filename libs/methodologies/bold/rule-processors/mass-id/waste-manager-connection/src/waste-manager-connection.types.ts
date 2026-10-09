import type { ConnectionEvidenceLoadResult } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

export interface WasteManagerConnectionInput {
  connectionEvidence: ConnectionEvidenceLoadResult;
  executionDocumentId: string;
  massIDDocument: BoldDocument;
}

export interface WasteManagerConnectionRuleSubject {
  connectionEvidence: ConnectionEvidenceLoadResult;
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
