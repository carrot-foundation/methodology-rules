import { isNil } from '@carrot-fndn/shared/helpers';
import {
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentCategory,
  type BoldDocumentEvent,
  BoldDocumentType,
  RewardsDistributionActorType,
  type RewardsDistributionResultContent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  attachExplicitAttributes,
  mergeEventsMaps,
  mergeMetadataAttributes,
  type MetadataAttributeParameter,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { RULE_RESULT_DETAILS, SLUG } = BoldAttributeName;

export const REWARDS_DISTRIBUTION_RULE_SLUG = 'rewards-distribution';

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [
    RULE_RESULT_DETAILS,
    {
      massIDDocumentId: faker.string.uuid(),
      massIDRewards: [
        {
          actorType: stubEnumValue(RewardsDistributionActorType),
          address: { id: faker.string.uuid() },
          massIDPercentage: faker.number.float({ max: 100, min: 1 }).toString(),
          participant: {
            id: faker.string.uuid(),
            name: faker.person.fullName(),
          },
          preserveSensitiveData: faker.datatype.boolean(),
        },
      ],
    } satisfies RewardsDistributionResultContent,
  ],
  [SLUG, REWARDS_DISTRIBUTION_RULE_SLUG],
];

export const stubBoldCertificateRewardsDistributionMetadataEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): BoldDocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: REWARDS_DISTRIBUTION_RULE_SLUG,
      },
      mergeMetadataAttributes(
        defaultRulesMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const boldCertificateExternalEventsMap = new Map([
  [
    REWARDS_DISTRIBUTION_RULE_SLUG,
    stubBoldCertificateRewardsDistributionMetadataEvent(),
  ],
]);

export const stubBoldCertificateDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): BoldDocument => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldCertificateExternalEventsMap
    : mergeEventsMaps(boldCertificateExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        type: faker.helpers.arrayElement([
          BoldDocumentType.GAS_ID,
          BoldDocumentType.RECYCLED_ID,
        ]),
        ...partialDocument,
        category: BoldDocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
      },
      false,
    ),
  };
};
