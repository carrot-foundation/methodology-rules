import type {
  BoldMethodologySlug,
  BoldDocument,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getOrDefault } from '@carrot-fndn/shared/helpers';
import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentStatus } from '@carrot-fndn/shared/types';

const { CANCELLED } = DocumentStatus;

export const hasMethodologySlugAttribute = (
  document: BoldDocument,
  methodologySlug: BoldMethodologySlug,
): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.METHODOLOGY_SLUG,
      metadataValues: methodologySlug,
    }),
  );

const isMassIDAuditPassed = (document: BoldDocument): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      metadataValues: 'PASSED',
    }),
  );

const isDocumentCancelled = (document: BoldDocument): boolean =>
  document.status === CANCELLED.toString();

export const hasNonCancelledDocuments = (documents: BoldDocument[]): boolean =>
  documents.some((document) => !isDocumentCancelled(document));

export const isMassIDAuditInProgress = (document: BoldDocument): boolean =>
  !isDocumentCancelled(document) &&
  getOrDefault(document.externalEvents, []).some(
    (event) =>
      !eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.EVALUATION_RESULT,
      }),
  );

export const hasPassedOrInProgressMassIDAuditForTheSameMethodology = (
  massIDAuditDocuments: BoldDocument[],
  methodologySlug: BoldMethodologySlug,
): boolean =>
  massIDAuditDocuments.some(
    (document) =>
      hasMethodologySlugAttribute(document, methodologySlug) &&
      (isMassIDAuditPassed(document) || isMassIDAuditInProgress(document)),
  );
