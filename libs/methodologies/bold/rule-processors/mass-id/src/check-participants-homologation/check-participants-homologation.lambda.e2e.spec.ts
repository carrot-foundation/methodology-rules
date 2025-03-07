import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
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
import { formatDate, subDays } from 'date-fns';

import { checkParticipantsHomologationLambda } from './check-participants-homologation.lambda';

const { CLOSE } = DocumentEventName;
const { HAULER } = DocumentSubtype;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

describe('CheckParticipantsHomologationProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massIdAuditWithHomologations = new BoldStubsBuilder()
    .createMethodologyDocuments()
    .createParticipantHomologationDocuments()
    .build();
  const massIdAuditWithoutHomologations = new BoldStubsBuilder().build();

  const expiredEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [
      [HOMOLOGATION_DATE, formatDate(subDays(new Date(), 10), 'yyyy-MM-dd')],
      [HOMOLOGATION_DUE_DATE, formatDate(subDays(new Date(), 2), 'yyyy-MM-dd')],
    ],
  );

  it.each([
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the participants homologation documents are found and the homologation is active',
    },
    {
      documents: [massIdAuditWithoutHomologations.massIdDocumentStub],
      massIdAuditDocumentStub:
        massIdAuditWithoutHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are not found',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        ...[
          ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
        ].filter((document) => document.subtype !== HAULER),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when some participants homologation documents are not found',
    },
    {
      documents: [
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when the mass document does not exist',
    },
    {
      documents: [
        {
          ...massIdAuditWithHomologations.massIdDocumentStub,
          externalEvents: [],
        },
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the mass document does not contain events',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        ...massIdAuditWithHomologations.participantsHomologationDocumentStubs
          .set(HAULER, {
            ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
              HAULER,
            )!,
            externalEvents: [expiredEvent],
          })
          .values(),
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the participants homologation documents are found and the homologation is not active',
    },
  ])(
    '$scenario',
    async ({ documents, massIdAuditDocumentStub, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [...documents, massIdAuditDocumentStub].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await checkParticipantsHomologationLambda(
        stubRuleInput({
          documentId: massIdAuditDocumentStub.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
