import type {
  BoldMethodologySlug,
  Document,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';

const { CANCELLED } = MethodologyDocumentStatus;

export const hasMethodologySlugAttribute = (
  document: Document,
  methodologySlug: BoldMethodologySlug,
): boolean =>
  document.externalEvents?.some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.METHODOLOGY_SLUG,
      metadataValues: methodologySlug,
    }),
  ) === true;

const isMassIdAuditApproved = (document: Document): boolean =>
  document.externalEvents?.some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      metadataValues: RuleOutputStatus.APPROVED,
    }),
  ) === true;

const isDocumentCancelled = (document: Document): boolean =>
  document.status === CANCELLED.toString();

export const hasSomeDocumentOpen = (documents: Document[]): boolean =>
  documents.some((document) => !isDocumentCancelled(document));

export const isMassIdAuditInProgress = (document: Document): boolean =>
  document.externalEvents?.some(
    (event) =>
      !eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      }) && !isDocumentCancelled(document),
  ) === true;

export const hasApprovedOrInProgressMassIdAuditForTheSameMethodology = (
  massIdAuditDocuments: Document[],
  methodologySlug: BoldMethodologySlug,
): boolean =>
  massIdAuditDocuments.some(
    (document) =>
      hasMethodologySlugAttribute(document, methodologySlug) &&
      (isMassIdAuditApproved(document) || isMassIdAuditInProgress(document)),
  );
