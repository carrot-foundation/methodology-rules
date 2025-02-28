import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
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
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { formatDate } from 'date-fns';

import { checkParticipantsHomologationLambda } from './check-participants-homologation.lambda';

const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('CheckParticipantsHomologationProcessor', () => {
  const documentKeyPrefix = faker.string.uuid();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const massId = faker.string.uuid();
  const massAuditId = faker.string.uuid();
  const homologatedParticipants = [
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
          ...PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match,
          documentId: faker.string.uuid(),
          subtype,
        },
      ]),
    );

  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.future(), 'yyyy-MM-dd')]],
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
          // TODO: update this logic to use the event label when it's available
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

  const documents: Document[] = [
    massAuditDocumentStub,
    massDocumentStub,
    ...participantsHomologationDocumentStubs.values(),
  ];

  beforeAll(() => {
    prepareEnvironmentTestE2E(
      documents.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );
  });

  it('should return APPROVED when the homologation document is not expired', async () => {
    const response = (await checkParticipantsHomologationLambda(
      stubRuleInput({
        documentId: massAuditReference.documentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(RuleOutputStatus.APPROVED);
  });
});
