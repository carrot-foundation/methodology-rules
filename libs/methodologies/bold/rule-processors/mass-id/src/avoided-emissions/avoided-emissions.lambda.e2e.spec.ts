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

import { avoidedEmissionsLambda } from './avoided-emissions.lambda';
import {
  avoidedEmissionsErrorTestCases,
  avoidedEmissionsTestCases,
} from './avoided-emissions.test-cases';

describe('AvoidedEmissionsProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(avoidedEmissionsTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      homologationDocuments,
      massIdDocumentValue,
      resultComment,
      resultStatus,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsHomologationDocuments,
      } = new BoldStubsBuilder()
        .createMassIdDocuments({
          partialDocument: {
            currentValue: massIdDocumentValue as number,
          },
        })
        .createMassIdAuditDocuments()
        .createMethodologyDocument()
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

      const response = (await avoidedEmissionsLambda(
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

  describe('AvoidedEmissionsProcessorErrors', () => {
    it.each(avoidedEmissionsErrorTestCases)(
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

        const response = (await avoidedEmissionsLambda(
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
