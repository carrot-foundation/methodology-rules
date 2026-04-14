import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  BoldMethodologyName,
  type RewardsDistributionResultContent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import BigNumber from 'bignumber.js';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import {
  rewardsDistributionProcessorErrors,
  rewardsDistributionProcessorTestCases,
} from './rewards-distribution.test-cases';

const { ONBOARDING_DECLARATION } = BoldDocumentEventName;
const { BUSINESS_SIZE_DECLARATION } = BoldAttributeName;
const { WASTE_GENERATOR } = BoldDocumentSubtype;

describe('RewardsDistributionProcessor', () => {
  const ruleDataProcessor = new RewardsDistributionProcessor();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('rewardsDistributionProcessorTestCases', () => {
    it.each(rewardsDistributionProcessorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        accreditationBusinessSize,
        expectedRewards,
        massIDDocumentEvents,
        massIDPartialDocument,
      }) => {
        const builder = new BoldStubsBuilder({
          methodologyName: BoldMethodologyName.RECYCLING,
        })
          .createMassIDDocuments({
            externalEventsMap: massIDDocumentEvents,
            partialDocument: massIDPartialDocument,
          })
          .createMassIDAuditDocuments()
          .createMethodologyDocument()
          .createMassIDCertificateDocuments();

        if (accreditationBusinessSize !== undefined) {
          builder.createParticipantAccreditationDocuments(
            new Map([
              [
                WASTE_GENERATOR,
                {
                  externalEventsMap: {
                    [ONBOARDING_DECLARATION]:
                      stubDocumentEventWithMetadataAttributes(
                        { name: ONBOARDING_DECLARATION },
                        [
                          [
                            BUSINESS_SIZE_DECLARATION,
                            accreditationBusinessSize,
                          ],
                        ],
                      ),
                  },
                },
              ],
            ]),
          );
        }

        const {
          massIDAuditDocument,
          massIDCertificateDocument,
          massIDDocument,
          methodologyDocument,
          participantsAccreditationDocuments,
        } = builder.build();

        const allDocuments = [
          massIDAuditDocument,
          massIDDocument,
          massIDCertificateDocument,
          methodologyDocument as BoldDocument,
          ...participantsAccreditationDocuments.values(),
        ];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        const { massIDRewards } =
          ruleOutput.resultContent as RewardsDistributionResultContent;

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
            (massIDReward) => massIDReward.actorType === actorType,
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
