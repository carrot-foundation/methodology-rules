import type {
  BoldMethodologySlug,
  Document,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getOrDefault } from '@carrot-fndn/shared/helpers';
import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';

const { CANCELLED } = MethodologyDocumentStatus;

export const hasMethodologySlugAttribute = (
  document: Document,
  methodologySlug: BoldMethodologySlug,
): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.METHODOLOGY_SLUG,
      metadataValues: methodologySlug,
    }),
  );

const isMassIdAuditApproved = (document: Document): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      metadataValues: RuleOutputStatus.APPROVED,
    }),
  );

const isDocumentCancelled = (document: Document): boolean =>
  document.status === CANCELLED.toString();

export const hasNonCancelledDocuments = (documents: Document[]): boolean =>
  documents.some((document) => !isDocumentCancelled(document));

export const isMassIdAuditInProgress = (document: Document): boolean =>
  !isDocumentCancelled(document) &&
  getOrDefault(document.externalEvents, []).some(
    (event) =>
      !eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      }),
  );

export const hasApprovedOrInProgressMassIdAuditForTheSameMethodology = (
  massIdAuditDocuments: Document[],
  methodologySlug: BoldMethodologySlug,
): boolean =>
  massIdAuditDocuments.some(
    (document) =>
      hasMethodologySlugAttribute(document, methodologySlug) &&
      (isMassIdAuditApproved(document) || isMassIdAuditInProgress(document)),
  );
