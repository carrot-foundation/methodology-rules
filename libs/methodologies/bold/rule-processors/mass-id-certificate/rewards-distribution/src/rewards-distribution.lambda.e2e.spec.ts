import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

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

import { rewardsDistributionLambda } from './rewards-distribution.lambda';
import {
  rewardsDistributionProcessorErrors,
  rewardsDistributionProcessorTestCases,
} from './rewards-distribution.test-cases';

describe('RewardsDistributionProcessor E2E', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(rewardsDistributionProcessorTestCases)(
    'should return $resultStatus when $scenario',
    async ({ massIDDocumentEvents, massIDPartialDocument, resultStatus }) => {
      const {
        massIDAuditDocument,
        massIDCertificateDocument,
        massIDDocument,
        methodologyDocument,
      } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: massIDDocumentEvents,
          partialDocument: massIDPartialDocument,
        })
        .createMassIDAuditDocuments()
        .createMassIDCertificateDocuments()
        .createMethodologyDocument()
        .build();

      prepareEnvironmentTestE2E(
        [
          massIDDocument,
          massIDAuditDocument,
          massIDCertificateDocument,
          methodologyDocument as Document,
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await rewardsDistributionLambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response).toMatchObject({
        resultStatus,
      });
    },
  );

  describe('RewardsDistributionProcessorErrors', () => {
    it.each(rewardsDistributionProcessorErrors)(
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

        const response = (await rewardsDistributionLambda(
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
