import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  type RewardDistributionResultContent,
  RewardsDistributionActorType,
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

export const REWARDS_DISTRIBUTION_RULE_SLUG = 'rewards-distribution';

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [
    'Rule Result Details',
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
    } satisfies RewardDistributionResultContent,
  ],
  ['Slug', REWARDS_DISTRIBUTION_RULE_SLUG],
];

export const stubBoldCertificateRewardsDistributionMetadataEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
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
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldCertificateExternalEventsMap
    : mergeEventsMaps(boldCertificateExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        type: faker.helpers.arrayElement(['GasID', 'RecycledID']),
        ...partialDocument,
        category: 'Methodology',
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
      },
      false,
    ),
  };
};
