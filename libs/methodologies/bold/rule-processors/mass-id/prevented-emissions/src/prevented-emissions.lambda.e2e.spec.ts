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

import { preventedEmissionsLambda } from './prevented-emissions.lambda';
import {
  preventedEmissionsErrorTestCases,
  preventedEmissionsTestCases,
} from './prevented-emissions.test-cases';

describe('PreventedEmissionsProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(preventedEmissionsTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      externalCreatedAt,
      homologationDocuments,
      massIdDocumentValue,
      resultComment,
      resultStatus,
      subtype,
    }) => {
      const {
        massIdAuditDocument,
        massIdDocument,
        participantsHomologationDocuments,
      } = new BoldStubsBuilder()
        .createMassIdDocuments({
          partialDocument: {
            currentValue: massIdDocumentValue as number,
            ...(externalCreatedAt && { externalCreatedAt }),
            subtype,
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

      const response = (await preventedEmissionsLambda(
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

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
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

        const response = (await preventedEmissionsLambda(
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
