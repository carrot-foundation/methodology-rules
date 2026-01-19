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

import { massIDSortingLambda } from './mass-id-sorting.lambda';
import {
  massIDSortingErrorTestCases,
  massIDSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIDSortingProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(massIDSortingTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIDEvents,
      partialDocument,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder({ massIDActorParticipants: actorParticipants })
        .createMassIDDocuments({
          externalEventsMap: massIDEvents,
          partialDocument,
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createParticipantAccreditationDocuments(accreditationDocuments)
        .build();

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

      const response = (await massIDSortingLambda(
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

  describe('MassIDSortingProcessorErrors', () => {
    it.each(massIDSortingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ documents, massIDAuditDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [...documents, massIDAuditDocument].map((document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await massIDSortingLambda(
          stubRuleInput({
            documentId: massIDAuditDocument.id,
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
