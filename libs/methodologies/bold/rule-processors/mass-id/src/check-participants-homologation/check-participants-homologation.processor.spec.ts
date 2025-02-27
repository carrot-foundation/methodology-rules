import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
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
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { formatDate } from 'date-fns';
import { random } from 'typia';

import { CheckParticipantsHomologationProcessorErrors } from './check-participants-homologation.errors';
import { CheckParticipantsHomologationProcessor } from './check-participants-homologation.processor';

const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('CheckParticipantsHomologationProcessor', () => {
  const ruleDataProcessor = new CheckParticipantsHomologationProcessor();
  const processorError = new CheckParticipantsHomologationProcessorErrors();

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
          category: DocumentCategory.METHODOLOGY,
          documentId: faker.string.uuid(),
          subtype,
          type: DocumentType.PARTICIPANT_HOMOLOGATION,
        },
      ]),
    );
  const expiredHomologationDocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.SOURCE,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  };

  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.future(), 'yyyy-MM-dd')]],
  );
  const expiredCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.past(), 'yyyy-MM-dd')]],
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
    stubParticipantHomologationDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.OPEN,
        }),
        expiredCloseEvent,
      ],
      id: expiredHomologationDocumentReference.documentId,
      subtype: expiredHomologationDocumentReference.subtype,
    });

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

  it.each([
    {
      documents: [
        massDocumentStub,
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the participants homologation documents are found and the homologation is not expired',
    },
    {
      documents: [
        {
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
        },
        ...participantsHomologationDocumentStubs.values(),
        expiredParticipantHomologationDocumentStub,
      ],
      resultComment: processorError.ERROR_MESSAGE.HOMOLOGATION_EXPIRED([
        expiredParticipantHomologationDocumentStub.id,
      ]),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are found and the homologation is expired',
    },
    {
      documents: [massDocumentStub],
      resultComment:
        processorError.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are not found',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            sourceParticipantEvent,
          ],
        },
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS(
          [sourceParticipantEvent.name],
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when some participants homologation documents are not found',
    },
    {
      documents: [...participantsHomologationDocumentStubs.values()],
      resultComment: processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when the mass document does not exist',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [],
        },
        ...participantsHomologationDocumentStubs.values(),
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massDocumentStub.id,
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the mass document does not contain events',
    },
  ])('$scenario', async ({ documents, resultComment, resultStatus }) => {
    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massAuditDocumentStub,
      ...documents,
    ]);

    const ruleInput = {
      ...random<Required<RuleInput>>(),
      documentId: massAuditId,
    };

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
