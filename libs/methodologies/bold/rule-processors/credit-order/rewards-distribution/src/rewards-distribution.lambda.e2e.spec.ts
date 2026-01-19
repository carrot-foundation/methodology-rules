import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import {
  MethodologyActorType,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

import type { RewardsDistribution } from './rewards-distribution.types';

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

  describe('RewardsDistributionProcessorTestCases', () => {
    it.each(rewardsDistributionProcessorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        creditOrderDocument,
        expectedActorsResult,
        massIDCertificateDocuments,
      }) => {
        prepareEnvironmentTestE2E(
          [...massIDCertificateDocuments, creditOrderDocument].map(
            (document) => ({
              document,
              documentKey: toDocumentKey({
                documentId: document.id,
                documentKeyPrefix,
              }),
            }),
          ),
        );

        const response = (await rewardsDistributionLambda(RECYCLED_ID)(
          stubRuleInput({
            documentId: creditOrderDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        const { actors, remainder } =
          response.resultContent as RewardsDistribution;

        const actorsResult = actors.map((actor) => ({
          actorType: actor.actorType,
          amount: actor.amount,
          percentage: actor.percentage,
        }));

        actorsResult.push({
          actorType: MethodologyActorType.REMAINDER,
          amount: remainder.amount,
          percentage: remainder.percentage,
        });

        for (const [index, actual] of actorsResult.entries()) {
          const expected = expectedActorsResult[index];

          if (!expected) {
            throw new Error(`Expected result at index ${index} is undefined`);
          }

          expect(actual.actorType).toBe(expected.actorType);
          expect(actual.percentage).toBe(expected.percentage);

          const actualAmount = new BigNumber(actual.amount);
          const expectedAmount = new BigNumber(expected.amount);

          expect(actualAmount.eq(expectedAmount)).toBeTruthy();
        }
      },
    );
  });

  describe('RewardsDistributionProcessorErrors', () => {
    it.each(rewardsDistributionProcessorErrors)(
      'should return $resultStatus when $scenario',
      async ({
        creditOrderDocument,
        massIDCertificateDocuments,
        resultStatus,
      }) => {
        prepareEnvironmentTestE2E(
          [...massIDCertificateDocuments, creditOrderDocument].map(
            (document) => ({
              document,
              documentKey: toDocumentKey({
                documentId: document?.id ?? random<NonEmptyString>(),
                documentKeyPrefix,
              }),
            }),
          ),
        );

        const response = (await rewardsDistributionLambda(RECYCLED_ID)(
          stubRuleInput({
            documentId: creditOrderDocument?.id ?? random<NonEmptyString>(),
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
