import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { geolocationPrecisionLambda } from './geolocation-precision.lambda';
import { geolocationPrecisionTestCases } from './geolocation-precision.test-cases';

describe('GeolocationPrecisionProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(geolocationPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      actorParticipants,
      homologationDocuments,
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsHomologationDocuments,
      } = new BoldStubsBuilder({ actorParticipants })
        .createMassIdDocument(massIdDocumentParameters)
        .createMassIdAuditDocument()
        .createMethodologyDocuments()
        .createParticipantHomologationDocuments(homologationDocuments)
        .build();

      prepareEnvironmentTestE2E(
        [
          massIdDocument,
          massIdAuditDocument,
          ...participantsHomologationDocuments.values(),
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await geolocationPrecisionLambda(
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
});
