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
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({ massIdActorParticipants: actorParticipants })
        .createMassIdDocuments(massIdDocumentParameters)
        .createMassIdAuditDocuments()
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

      massIdAuditDocument.externalEvents = [
        ...(massIdAuditDocument.externalEvents ?? []),
        ...auditActorEvents,
      ];

      prepareEnvironmentTestE2E(
        [
          massIdDocument,
          massIdAuditDocument,
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
          documentId: massIdAuditDocument.id,
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
      async ({ documents, massIdAuditDocument, resultStatus }) => {
        const documentEntries = (
          [...documents, massIdAuditDocument].filter(Boolean) as Document[]
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
            documentId: massIdAuditDocument?.id ?? faker.string.uuid(),
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
