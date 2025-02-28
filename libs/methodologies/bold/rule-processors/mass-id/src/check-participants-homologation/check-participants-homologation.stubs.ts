import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
  stubMassDocument,
  stubParticipantHomologationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import { addDays, formatDate, subDays } from 'date-fns';

const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

const DATE_FORMAT = 'yyyy-MM-dd';

export const createCheckParticipantsHomologationTestData = (options?: {
  homologatedParticipants?: DocumentSubtype[];
  includeExpiredHomologation?: boolean;
  massAuditId?: string;
  massId?: string;
}) => {
  const massId = options?.massId ?? faker.string.uuid();
  const massAuditId = options?.massAuditId ?? faker.string.uuid();
  const homologatedParticipants = options?.homologatedParticipants ?? [
    DocumentSubtype.HAULER,
    DocumentSubtype.PROCESSOR,
    DocumentSubtype.RECYCLER,
    DocumentSubtype.WASTE_GENERATOR,
  ];

  const massReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massId,
    type: DocumentType.ORGANIC,
  };

  const massAuditReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massAuditId,
    subtype: DocumentSubtype.PROCESS,
    type: DocumentType.MASS_AUDIT,
  };

  const participantsReference: Map<DocumentSubtype, DocumentReference> =
    new Map(
      homologatedParticipants.map((subtype) => [
        subtype,
        {
          category: DocumentCategory.METHODOLOGY,
          documentId: faker.string.uuid(),
          subtype,
          type: DocumentType.PARTICIPANT_HOMOLOGATION,
        },
      ]),
    );

  const expiredHomologationDocumentReference =
    (options?.includeExpiredHomologation ?? false)
      ? {
          category: DocumentCategory.METHODOLOGY,
          documentId: faker.string.uuid(),
          subtype: DocumentSubtype.SOURCE,
          type: DocumentType.PARTICIPANT_HOMOLOGATION,
        }
      : undefined;

  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [
      [HOMOLOGATION_DATE, formatDate(subDays(new Date(), 2), DATE_FORMAT)],
      [HOMOLOGATION_DUE_DATE, formatDate(addDays(new Date(), 2), DATE_FORMAT)],
    ],
  );

  const expiredCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [
      [HOMOLOGATION_DUE_DATE, formatDate(subDays(new Date(), 1), DATE_FORMAT)],
      [HOMOLOGATION_DATE, formatDate(subDays(new Date(), 4), DATE_FORMAT)],
    ],
  );

  const participantsHomologationDocumentStubs: Map<DocumentSubtype, Document> =
    new Map(
      homologatedParticipants.map((subtype) => [
        subtype,
        stubParticipantHomologationDocument({
          externalEvents: [
            stubDocumentEvent({
              name: DocumentEventName.OPEN,
            }),
            homologationCloseEvent,
          ],
          id: participantsReference.get(subtype)?.documentId ?? '',
          subtype,
        }),
      ]),
    );

  const expiredParticipantHomologationDocumentStub =
    expiredHomologationDocumentReference
      ? stubParticipantHomologationDocument({
          externalEvents: [
            stubDocumentEvent({
              name: DocumentEventName.OPEN,
            }),
            expiredCloseEvent,
          ],
          id: expiredHomologationDocumentReference.documentId,
          subtype: expiredHomologationDocumentReference.subtype,
        })
      : undefined;

  const massDocumentStub = stubMassDocument({
    externalEvents: [
      ...homologatedParticipants.map((subtype) =>
        stubDocumentEventWithMetadataAttributes(
          {
            name: DocumentEventName.ACTOR,
            participant: {
              id:
                participantsHomologationDocumentStubs.get(subtype)
                  ?.primaryParticipant.id ?? '',
            },
          },
          [[DocumentEventAttributeName.ACTOR_TYPE, subtype]],
        ),
      ),
      stubDocumentEvent({
        name: DocumentEventName.OUTPUT,
        relatedDocument: massAuditReference,
      }),
    ],
    id: massReference.documentId,
  });

  const massAuditDocumentStub = stubMassAuditDocument({
    externalEvents: homologatedParticipants.map((subtype) =>
      stubDocumentEvent({
        name: DocumentEventName.LINK,
        referencedDocument: participantsReference.get(subtype),
        relatedDocument: undefined,
      }),
    ),
    id: massAuditReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });

  const sourceParticipantEvent = stubDocumentEvent({
    name: DocumentEventName.ACTOR,
    relatedDocument: {
      category: DocumentCategory.METHODOLOGY,
      subtype: DocumentSubtype.SOURCE,
      type: DocumentType.PARTICIPANT_HOMOLOGATION,
    },
  });

  const massWithExpiredHomologationStub =
    expiredParticipantHomologationDocumentStub
      ? {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            stubDocumentEvent({
              name: DocumentEventName.ACTOR,
              participant: {
                id: expiredParticipantHomologationDocumentStub
                  .primaryParticipant.id,
              },
            }),
          ],
        }
      : undefined;

  const massWithSourceParticipantStub = {
    ...massDocumentStub,
    externalEvents: [
      ...(massDocumentStub.externalEvents ?? []),
      sourceParticipantEvent,
    ],
  };

  const massWithNoEventsStub = {
    ...massDocumentStub,
    externalEvents: [],
  };

  const documents: Document[] = [
    massAuditDocumentStub,
    massDocumentStub,
    ...participantsHomologationDocumentStubs.values(),
  ];

  if (expiredParticipantHomologationDocumentStub) {
    documents.push(expiredParticipantHomologationDocumentStub);
  }

  return {
    documents,
    expiredCloseEvent,
    expiredHomologationDocumentReference,
    expiredParticipantHomologationDocumentStub,
    homologatedParticipants,
    homologationCloseEvent,
    massAuditDocumentStub,
    massAuditId,
    massAuditReference,
    massDocumentStub,
    massId,
    massReference,
    massWithExpiredHomologationStub,
    massWithNoEventsStub,
    massWithSourceParticipantStub,
    participantsHomologationDocumentStubs,
    participantsReference,
    sourceParticipantEvent,
  };
};
