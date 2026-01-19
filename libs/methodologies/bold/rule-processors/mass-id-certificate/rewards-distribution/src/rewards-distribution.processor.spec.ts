import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldMethodologyName,
  type Document,
  type RewardDistributionResultContent,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

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
        expectedRewards,
        massIdDocumentEvents,
        massIdPartialDocument,
        wasteGeneratorVerificationDocument,
      }) => {
        const {
          massIdAuditDocument,
          massIdCertificateDocument,
          massIdDocument,
          methodologyDocument,
        } = new BoldStubsBuilder({
          methodologyName: BoldMethodologyName.RECYCLING,
        })
          .createMassIdDocuments({
            externalEventsMap: massIdDocumentEvents,
            partialDocument: massIdPartialDocument,
          })
          .createMassIdAuditDocuments()
          .createMassIdCertificateDocuments()
          .createMethodologyDocument()
          .build();

        const allDocuments = [
          massIdAuditDocument,
          massIdDocument,
          massIdCertificateDocument,
          methodologyDocument as Document,
          ...(wasteGeneratorVerificationDocument
            ? [wasteGeneratorVerificationDocument]
            : []),
        ];

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIdAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        const { massIdRewards } =
          ruleOutput.resultContent as RewardDistributionResultContent;

        const totalPercentage = sumBigNumbers(
          massIdRewards.map(
            ({ massIdPercentage }) => new BigNumber(massIdPercentage),
          ),
        );

        expect(ruleOutput.resultContent).toMatchObject({
          massIdDocumentId: massIdDocument.id,
        });

        for (const actorType of Object.keys(expectedRewards)) {
          const reward = massIdRewards.find(
            (massIdReward) =>
              massIdReward.actorType ===
              (actorType as RewardsDistributionActorType),
          );

          expect(reward).toBeDefined();
          expect(reward?.massIdPercentage).toBe(expectedRewards[actorType]);
        }

        expect(totalPercentage.eq(BigNumber(100))).toBeTruthy();
      },
    );
  });

  describe('rewardsDistributionProcessorErrors', () => {
    it.each(rewardsDistributionProcessorErrors)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIdAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIdAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIdAuditDocument.id,
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
