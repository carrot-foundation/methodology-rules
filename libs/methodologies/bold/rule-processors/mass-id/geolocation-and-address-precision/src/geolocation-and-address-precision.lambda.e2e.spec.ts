import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { geolocationAndAddressPrecisionLambda } from './geolocation-and-address-precision.lambda';
import {
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionTestCases,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIDDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({ massIDActorParticipants: actorParticipants })
        .createMassIDDocuments(massIDDocumentParameters)
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

      const auditActorEvents = [...actorParticipants.values()].map(
        (participant) =>
          stubDocumentEvent({
            label: participant.type,
            name: DocumentEventName.ACTOR,
            participant,
            relatedDocument: {
              documentId: participantsAccreditationDocuments.get(
                participant.type,
              )!.id,
            },
          }),
      );

      massIDAuditDocument.externalEvents = [
        ...(massIDAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      prepareEnvironmentTestE2E(
        [
          massIDDocument,
          massIDAuditDocument,
          ...participantsAccreditationDocuments.values(),
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await geolocationAndAddressPrecisionLambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response).toMatchObject({
        resultComment,
        resultStatus,
      });
    },
  );

  describe('GeolocationAndAddressPrecisionProcessorErrors', () => {
    it.each(geolocationAndAddressPrecisionErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ documents, massIDAuditDocument, resultStatus }) => {
        const documentEntries = (
          [...documents, massIDAuditDocument].filter(Boolean) as Document[]
        ).map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        }));

        if (documentEntries.length > 0) {
          prepareEnvironmentTestE2E(documentEntries);
        }

        const response = (await geolocationAndAddressPrecisionLambda(
          stubRuleInput({
            documentId: massIDAuditDocument?.id ?? faker.string.uuid(),
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });
});
