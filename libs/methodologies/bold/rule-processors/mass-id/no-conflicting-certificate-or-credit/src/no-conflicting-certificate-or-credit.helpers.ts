import type {
  BoldMethodologySlug,
  Document,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getOrDefault } from '@carrot-fndn/shared/helpers';
import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentStatus } from '@carrot-fndn/shared/types';

export const hasMethodologySlugAttribute = (
  document: Document,
  methodologySlug: BoldMethodologySlug,
): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName['Methodology Slug'],
      metadataValues: methodologySlug,
    }),
  );

const isMassIDAuditPassed = (document: Document): boolean =>
  getOrDefault(document.externalEvents, []).some((event) =>
    eventHasMetadataAttribute({
      event,
      metadataName: DocumentEventAttributeName['Evaluation Result'],
      metadataValues: 'PASSED',
    }),
  );

const isDocumentCancelled = (document: Document): boolean =>
  document.status === MethodologyDocumentStatus.CANCELLED.toString();

export const hasNonCancelledDocuments = (documents: Document[]): boolean =>
  documents.some((document) => !isDocumentCancelled(document));

export const isMassIDAuditInProgress = (document: Document): boolean =>
  !isDocumentCancelled(document) &&
  getOrDefault(document.externalEvents, []).some(
    (event) =>
      !eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName['Evaluation Result'],
      }),
  );

export const hasPassedOrInProgressMassIDAuditForTheSameMethodology = (
  massIDAuditDocuments: Document[],
  methodologySlug: BoldMethodologySlug,
): boolean =>
  massIDAuditDocuments.some(
    (document) =>
      hasMethodologySlugAttribute(document, methodologySlug) &&
      (isMassIDAuditPassed(document) || isMassIDAuditInProgress(document)),
  );
