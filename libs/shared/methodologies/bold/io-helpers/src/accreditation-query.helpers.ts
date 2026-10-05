import type { DocumentLoader } from '@carrot-fndn/shared/document/loader';

import {
  type AccreditationEvaluationContext,
  getAccreditationEvaluationContext,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_CONTAINER,
  PARTICIPANT_ACCREDITATION_GROUP,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
  PARTICIPANT_ACCREDITATION_ROOT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { type BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';

import {
  BOLD_ROOT_DOCUMENT_CRITERIA,
  LEGACY_PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from './document-query.criteria';
import { DocumentQueryService } from './document-query.service';
import {
  type DocumentQuery,
  type QueryContext,
} from './document-query.service.types';

export interface AccreditationDocumentsSubject {
  accreditationDocuments: BoldDocument[];
  evaluation: AccreditationEvaluationContext;
  massIDDocument: BoldDocument | undefined;
}

export const collectAccreditationDocuments = async (
  documentQuery: DocumentQuery<BoldDocument> | undefined,
  legacyEvaluationDate: string,
): Promise<AccreditationDocumentsSubject> => {
  const accreditationDocuments: BoldDocument[] = [];
  const accreditationGroups: BoldDocument[] = [];
  let massIDDocument: BoldDocument | undefined;

  await documentQuery?.iterator().each(({ document }) => {
    const relation = mapDocumentRelation(document);

    if (MASS_ID.matches(relation)) {
      massIDDocument = document;
    }

    if (
      PARTICIPANT_ACCREDITATION_GROUP.matches(relation) ||
      PARTICIPANT_ACCREDITATION_CONTAINER.matches(relation) ||
      PARTICIPANT_ACCREDITATION_ROOT.matches(relation)
    ) {
      accreditationGroups.push(document);
    } else if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(relation)) {
      accreditationDocuments.push(document);
    }
  });

  const evaluation =
    documentQuery === undefined
      ? {
          evaluationDate: legacyEvaluationDate,
          methodologyId: undefined,
          methodologyVersion: undefined,
        }
      : getAccreditationEvaluationContext(
          documentQuery.rootDocument,
          legacyEvaluationDate,
        );

  if (evaluation.methodologyId !== undefined) {
    const historyDocuments = [
      ...accreditationDocuments,
      ...accreditationGroups,
    ];
    const children = [
      ...accreditationDocuments,
      ...accreditationGroups.filter(
        (document) =>
          PARTICIPANT_ACCREDITATION_CONTAINER.matches(
            mapDocumentRelation(document),
          ) ||
          PARTICIPANT_ACCREDITATION_GROUP.matches(
            mapDocumentRelation(document),
          ),
      ),
    ];

    for (const document of children) {
      const group = accreditationGroups.find(
        (candidate) =>
          candidate.id === document.parentDocumentId &&
          (accreditationDocuments.includes(document)
            ? !PARTICIPANT_ACCREDITATION_ROOT.matches(
                mapDocumentRelation(candidate),
              )
            : PARTICIPANT_ACCREDITATION_ROOT.matches(
                mapDocumentRelation(candidate),
              )),
      );

      if (
        group === undefined ||
        group.externalEvents?.some(
          (event) =>
            event.relatedDocument?.documentId === document.id &&
            PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(
              event.relatedDocument,
            ),
        ) !== true ||
        group.externalEvents.some(
          ({ relatedDocument }) =>
            relatedDocument !== undefined &&
            relatedDocument.documentId !== group.parentDocumentId &&
            (!PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(
              relatedDocument,
            ) ||
              !historyDocuments.some(
                (candidate) =>
                  candidate.id === relatedDocument.documentId &&
                  candidate.parentDocumentId === group.id,
              )),
        )
      ) {
        throw new Error('Accreditation history group is missing or incomplete');
      }
    }
  }

  return { accreditationDocuments, evaluation, massIDDocument };
};

export const loadAccreditationDocumentQuery = async ({
  context,
  documentId,
  documentLoaderService,
  legacyEvaluationDate,
}: {
  context: QueryContext;
  documentId: string;
  documentLoaderService: DocumentLoader;
  legacyEvaluationDate: string;
}): Promise<DocumentQuery<BoldDocument>> => {
  const service = new DocumentQueryService(documentLoaderService);
  const rootQuery = await service.load({
    context,
    criteria: BOLD_ROOT_DOCUMENT_CRITERIA,
    documentId,
  });
  const evaluation = getAccreditationEvaluationContext(
    rootQuery.rootDocument,
    legacyEvaluationDate,
  );
  const criteria =
    evaluation.methodologyId === undefined
      ? LEGACY_PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA
      : PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA;

  return service.load({ context, criteria, documentId });
};
