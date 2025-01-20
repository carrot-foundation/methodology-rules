import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
  stubParticipantHomologationDocument,
  stubParticipantHomologationGroupDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
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
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { formatDate } from 'date-fns';

import { handler } from '../lambda';

const { CLOSE } = MethodologyDocumentEventName;
const { HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('DropOffGeolocationPrecision', () => {
  const documentKeyPrefix = faker.string.uuid();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const massAuditId = faker.string.uuid();
  const massReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.ORGANIC,
  };
  const massAuditReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massAuditId,
    type: DocumentType.MASS_AUDIT,
  };
  const methodologyReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.DEFINITION,
  };
  const participantHomologationGroupReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  };
  const recyclerHomologationReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.SOURCE,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  };

  const moveDocumentEvent = stubDocumentEvent({
    address: {
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
    },
    metadata: {
      attributes: [
        {
          isPublic: faker.datatype.boolean(),
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DocumentEventMoveType.PICK_UP,
        },
      ],
    },
    name: MethodologyDocumentEventName.MOVE,
  });
  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.future(), 'yyyy/MM/dd')]],
  );
  const massDocumentStub = stubMassDocument({
    externalEvents: [
      moveDocumentEvent,
      stubDocumentEvent({
        name: MethodologyDocumentEventName.OUTPUT,
        relatedDocument: massAuditReference,
      }),
    ],
    id: massReference.documentId,
  });
  const massAuditDocumentStub = stubMassAuditDocument({
    externalEvents: [
      stubDocumentEvent({
        name: MethodologyDocumentEventName.ACTOR,
        referencedDocument: methodologyReference,
        relatedDocument: undefined,
      }),
    ],
    id: massAuditReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });
  const methodologyDocumentStub = stubMethodologyDefinitionDocument({
    externalEvents: [
      stubDocumentEvent({
        name: MethodologyDocumentEventName.OUTPUT,
        relatedDocument: participantHomologationGroupReference,
      }),
    ],
    id: methodologyReference.documentId,
  });
  const participantHomologationGroupDocumentStub =
    stubParticipantHomologationGroupDocument({
      externalEvents: [
        stubDocumentEvent({
          name: MethodologyDocumentEventName.OUTPUT,
          relatedDocument: recyclerHomologationReference,
        }),
      ],
      id: participantHomologationGroupReference.documentId,
      parentDocumentId: methodologyDocumentStub.id,
    });
  const recyclerHomologationDocumentStub = stubParticipantHomologationDocument({
    externalEvents: [
      stubDocumentEvent({
        address: moveDocumentEvent.address,
        name: MethodologyDocumentEventName.OPEN,
        participant: moveDocumentEvent.participant,
      }),
      homologationCloseEvent,
    ],
    id: recyclerHomologationReference.documentId,
    parentDocumentId: participantHomologationGroupReference.documentId,
    subtype: DocumentSubtype.RECYCLER,
  });

  const documents: Document[] = [
    massAuditDocumentStub,
    massDocumentStub,
    methodologyDocumentStub,
    participantHomologationGroupDocumentStub,
    {
      ...recyclerHomologationDocumentStub,
      externalEvents: [
        stubDocumentEvent({
          address: moveDocumentEvent.address,
          name: MethodologyDocumentEventName.OPEN,
        }),
      ],
    },
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

  it('should return APPROVED when the homologation address is equal and the precision is valid', async () => {
    const response = (await handler(
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
