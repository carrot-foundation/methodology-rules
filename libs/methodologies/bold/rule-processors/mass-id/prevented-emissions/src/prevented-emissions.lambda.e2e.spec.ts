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
      accreditationDocuments,
      externalCreatedAt,
      massIDDocumentValue,
      resultComment,
      resultStatus,
      subtype,
    }) => {
      const {
        massIDAuditDocument,
        massIDDocument,
        participantsAccreditationDocuments,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          partialDocument: {
            currentValue: massIDDocumentValue as number,
            externalCreatedAt,
            subtype,
          },
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

      const response = (await preventedEmissionsLambda(
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

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
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

        const response = (await preventedEmissionsLambda(
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
