import type { NonEmptyArray } from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import {
  stubDocumentEventWithMetadataAttributes,
  stubMassCertificateAuditDocument,
  stubMassDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type CertificateReward,
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventRuleSlug,
  type MassReward,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

const { END, RULE_EXECUTION } = MethodologyDocumentEventName;
const { RULE_PROCESSOR_RESULT_CONTENT, RULE_SLUG } = DocumentEventAttributeName;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;
const { NETWORK } = DocumentEventActorType;

export const stubUnitPrice = () =>
  faker.number.float({ max: 10, min: 0.000_001 });

export const stubMassCertificateAuditDocumentWithResultContent = (
  partialDocument?: PartialDeep<Document>,
  resultContent?: CertificateRewardDistributionOutput,
) =>
  stubMassCertificateAuditDocument({
    ...partialDocument,
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: RULE_EXECUTION }, [
        [RULE_SLUG, REWARDS_DISTRIBUTION],
        [
          RULE_PROCESSOR_RESULT_CONTENT,
          resultContent ?? random<CertificateRewardDistributionOutput>(),
        ],
      ]),
    ],
  });

export const stubMassDocumentWithEndEventValue = (endEventValue?: number) =>
  stubMassDocument({
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({
        name: END,
        value: endEventValue ?? faker.number.float(),
      }),
    ],
  });

export const stubCertificateRewardsDistributionResultContent =
  (): CertificateRewardDistributionOutput => {
    const certificateRewards: NonEmptyArray<CertificateReward> = [
      {
        ...random<CertificateReward>(),
        actorType: NETWORK,
      },
      ...stubArray(() => ({
        ...random<CertificateReward>(),
        actorType: random<Exclude<RewardsDistributionActorType, 'NETWORK'>>(),
      })),
    ];

    let remainderPercentage = new BigNumber(100);

    const calculatePercentage = () => {
      const percentage = faker.number.float({
        fractionDigits: 10,
        max: remainderPercentage.toNumber(),
        min: 0,
      });

      remainderPercentage = remainderPercentage.minus(percentage);

      return percentage.toString();
    };

    for (const [index] of certificateRewards.entries()) {
      // eslint-disable-next-line security/detect-object-injection
      const certificateReward = certificateRewards[index] as CertificateReward;

      certificateReward.percentage =
        certificateRewards.length === index + 1
          ? remainderPercentage.toString()
          : calculatePercentage();
    }

    return {
      certificateRewards,
      massRewards: [
        random<MassReward>(),
        ...stubArray(() => random<MassReward>()),
      ],
    };
  };
