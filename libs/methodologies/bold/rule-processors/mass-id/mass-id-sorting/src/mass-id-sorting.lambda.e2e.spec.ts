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

import { massIdSortingLambda } from './mass-id-sorting.lambda';
import {
  massIdSortingErrorTestCases,
  massIdSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIdSortingProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(massIdSortingTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIdEvents,
      partialDocument,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({ massIdActorParticipants: actorParticipants })
        .createMassIdDocuments({
          externalEventsMap: massIdEvents,
          partialDocument,
        })
        .createMassIdAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

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

      const response = (await massIdSortingLambda(
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

  describe('MassIdSortingProcessorErrors', () => {
    it.each(massIdSortingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ documents, massIdAuditDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [...documents, massIdAuditDocument].map((document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await massIdSortingLambda(
          stubRuleInput({
            documentId: massIdAuditDocument.id,
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
