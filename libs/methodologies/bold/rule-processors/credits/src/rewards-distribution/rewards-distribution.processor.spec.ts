import { isNil, sumBigNumbers } from '@carrot-fndn/shared/helpers';
import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadParentDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyActorType,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

import type { RewardsDistribution } from './rewards-distribution.types';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import {
  rewardsDistributionProcessorErrors,
  rewardsDistributionProcessorTestCases,
} from './rewards-distribution.test-cases';

describe('RewardsDistributionProcessor', () => {
  const ruleDataProcessor = new RewardsDistributionProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('rewardsDistributionProcessorTestCases', () => {
    it.each(rewardsDistributionProcessorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        certificateDocuments,
        creditsDocument,
        expectedActorsResult,
        expectedMassIdTotalValue,
        unitPrice,
      }) => {
        spyOnLoadParentDocument(creditsDocument);
        spyOnDocumentQueryServiceLoad(creditsDocument, certificateDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: creditsDocument.id,
        };

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        const { actors, creditsUnitPrice, massIdTotalValue, remainder } =
          ruleOutput.resultContent as RewardsDistribution;

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

        const totalPercentage = sumBigNumbers(
          actorsResult.map((actor) => BigNumber(actor.percentage)),
        );
        const totalAmount = sumBigNumbers(
          actorsResult.map((actor) => BigNumber(actor.amount)),
        );
        const totalCreditsPrice =
          BigNumber(creditsUnitPrice).multipliedBy(massIdTotalValue);

        expect(
          Math.abs(totalPercentage.minus(100).toNumber()) < 0.000_005,
        ).toBeTruthy();
        expect(
          Math.abs(totalAmount.minus(totalCreditsPrice).toNumber()) < 0.000_005,
        ).toBeTruthy();
        expect(creditsUnitPrice).toBe(unitPrice);
        expect(massIdTotalValue).toBe(String(expectedMassIdTotalValue));

        expect(actorsResult.length).toBe(expectedActorsResult.length);

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

  describe('rewardsDistributionProcessorErrors', () => {
    it.each(rewardsDistributionProcessorErrors)(
      'should return $resultStatus when $scenario',
      async ({
        certificateDocuments,
        creditsDocument,
        resultComment,
        resultStatus,
      }) => {
        if (!isNil(creditsDocument)) {
          spyOnLoadParentDocument(creditsDocument);
        }

        spyOnDocumentQueryServiceLoad(stubDocument(), certificateDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: creditsDocument?.id ?? random<NonEmptyString>(),
        };

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });
});
