import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassDocument,
  stubMassValidationDocument,
  stubMethodologyDefinitionDocument,
  stubParticipantHomologationDocument,
  stubParticipantHomologationGroupDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';
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
import { faker } from '@faker-js/faker';
import { formatDate } from 'date-fns';

import { handler } from '../lambda';

const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('PickUpGeolocationPrecision', () => {
  const documentKeyPrefix = faker.string.uuid();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const massValidationId = faker.string.uuid();
  const massReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.ORGANIC,
  };
  const massValidationReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massValidationId,
    type: DocumentType.MASS_VALIDATION,
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

  const pickUpDocumentEvent = stubDocumentEvent({
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
    name: DocumentEventName.OPEN,
  });
  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.future(), 'yyyy/MM/dd')]],
  );
  const massDocumentStub = stubMassDocument({
    externalEvents: [
      pickUpDocumentEvent,
      stubDocumentEvent({
        name: DocumentEventName.OUTPUT,
        relatedDocument: massValidationReference,
      }),
    ],
    id: massReference.documentId,
  });
  const massValidationDocumentStub = stubMassValidationDocument({
    externalEvents: [
      stubDocumentEvent({
        name: DocumentEventName.ACTOR,
        referencedDocument: methodologyReference,
        relatedDocument: undefined,
      }),
    ],
    id: massValidationReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });
  const methodologyDocumentStub = stubMethodologyDefinitionDocument({
    externalEvents: [
      stubDocumentEvent({
        name: DocumentEventName.OUTPUT,
        relatedDocument: participantHomologationGroupReference,
      }),
    ],
    id: methodologyReference.documentId,
  });
  const participantHomologationGroupDocumentStub =
    stubParticipantHomologationGroupDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.OUTPUT,
          relatedDocument: recyclerHomologationReference,
        }),
      ],
      id: participantHomologationGroupReference.documentId,
      parentDocumentId: methodologyDocumentStub.id,
    });
  const recyclerHomologationDocumentStub = stubParticipantHomologationDocument({
    externalEvents: [
      stubDocumentEvent({
        address: pickUpDocumentEvent.address,
        name: DocumentEventName.OPEN,
        participant: pickUpDocumentEvent.participant,
      }),
      homologationCloseEvent,
    ],
    id: recyclerHomologationReference.documentId,
    parentDocumentId: participantHomologationGroupReference.documentId,
    subtype: DocumentSubtype.SOURCE,
  });

  const documents: Document[] = [
    massDocumentStub,
    massValidationDocumentStub,
    methodologyDocumentStub,
    participantHomologationGroupDocumentStub,
    recyclerHomologationDocumentStub,
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
        documentId: massValidationReference.documentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(RuleOutputStatus.APPROVED);
  });
});
