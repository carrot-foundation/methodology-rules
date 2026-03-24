import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  type RewardDistributionResultContent,
  type RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import BigNumber from 'bignumber.js';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import {
  rewardsDistributionProcessorErrors,
  rewardsDistributionProcessorTestCases,
} from './rewards-distribution.test-cases';

describe('RewardsDistributionProcessor', () => {
  const ruleDataProcessor = new RewardsDistributionProcessor();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('rewardsDistributionProcessorTestCases', () => {
    it.each(rewardsDistributionProcessorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        expectedRewards,
        massIDDocumentEvents,
        massIDPartialDocument,
        wasteGeneratorVerificationDocument,
      }) => {
        const {
          massIDAuditDocument,
          massIDCertificateDocument,
          massIDDocument,
          methodologyDocument,
        } = new BoldStubsBuilder({
          methodologyName: 'BOLD Recycling',
        })
          .createMassIDDocuments({
            externalEventsMap: massIDDocumentEvents,
            partialDocument: massIDPartialDocument,
          })
          .createMassIDAuditDocuments()
          .createMassIDCertificateDocuments()
          .createMethodologyDocument()
          .build();

        const allDocuments = [
          massIDAuditDocument,
          massIDDocument,
          massIDCertificateDocument,
          methodologyDocument as Document,
          ...(wasteGeneratorVerificationDocument
            ? [wasteGeneratorVerificationDocument]
            : []),
        ];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        const { massIDRewards } =
          ruleOutput.resultContent as RewardDistributionResultContent;

        const totalPercentage = sumBigNumbers(
          massIDRewards.map(
            ({ massIDPercentage }) => new BigNumber(massIDPercentage),
          ),
        );

        expect(ruleOutput.resultContent).toMatchObject({
          massIDDocumentId: massIDDocument.id,
        });

        for (const actorType of Object.keys(expectedRewards)) {
          const reward = massIDRewards.find(
            (massIDReward) =>
              massIDReward.actorType ===
              (actorType as RewardsDistributionActorType),
          );

          expect(reward).toBeDefined();
          expect(reward?.massIDPercentage).toBe(expectedRewards[actorType]);
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
        massIDAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIDAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

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
