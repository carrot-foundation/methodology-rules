import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { AnyObject, NonEmptyArray } from '@carrot-fndn/shared/types';

import {
  BoldStubsBuilder,
  CREDITS_EVENT_NAME,
  MASS_ID_ACTOR_PARTICIPANTS,
  METHODOLOGY_ACTOR_PARTICIPANTS,
  REWARDS_DISTRIBUTION_RULE_SLUG,
  stubBoldCertificateRewardsDistributionMetadataEvent,
  stubBoldCreditOrderCreditsEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldActorType,
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  BoldDocumentType,
  BoldMethodologyActorType,
  BoldMethodologyName,
  MassIDActorType,
  RewardsDistributionActorType,
  type RewardsDistributionMassIDReward,
  type RewardsDistributionResultContent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { faker } from '@faker-js/faker';

import { ERROR_MESSAGES } from './rewards-distribution.errors';

type ActorResult = {
  actorType: string;
  amount: string;
  percentage: string;
};

type CertificateDocument = BoldDocument;
type CreditOrderDocument = BoldDocument;

type ErrorTestCase = RuleTestCase & {
  creditOrderDocument: CreditOrderDocument | undefined;
  massIDCertificateDocuments: CertificateDocument[];
};

type TestCase = Omit<RuleTestCase, 'resultComment'> & {
  creditOrderDocument: CreditOrderDocument;
  expectedActorsResult: ActorResult[];
  expectedCertificateTotalValue: number;
  massIDCertificateDocuments: CertificateDocument[];
  resultComment?: string;
  unitPrice: number;
};

const { CREDIT_ORDER, RECYCLED_ID } = BoldDocumentType;
const { FOOD_FOOD_WASTE_AND_BEVERAGES } = BoldDocumentSubtype;
const { RELATED } = BoldDocumentEventName;
const { CREDIT_UNIT_PRICE, RULE_RESULT_DETAILS } = BoldAttributeName;
const {
  COMMUNITY_IMPACT_POOL,
  HAULER,
  INTEGRATOR,
  METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER,
  NETWORK,
  PROCESSOR,
  RECYCLER,
  WASTE_GENERATOR,
} = RewardsDistributionActorType;

const UNIT_PRICE_VALUE = 0.153_33;

const DEFAULT_REWARDS = {
  [COMMUNITY_IMPACT_POOL]: '0',
  [INTEGRATOR]: '8',
  [METHODOLOGY_AUTHOR]: '1',
  [METHODOLOGY_DEVELOPER]: '1',
};

const STANDARD_REWARDS_DISTRIBUTION = {
  [HAULER]: '10',
  [NETWORK]: '20',
  [PROCESSOR]: '10',
  [RECYCLER]: '20',
  [WASTE_GENERATOR]: '15',
  ...DEFAULT_REWARDS,
  [COMMUNITY_IMPACT_POOL]: '15',
};

const MULTI_HAULER_REWARDS_DISTRIBUTION = {
  [COMMUNITY_IMPACT_POOL]: '0',
  [HAULER]: ['3.333333', '3.333333', '3.333334'],
  [INTEGRATOR]: '8',
  [METHODOLOGY_AUTHOR]: '1',
  [METHODOLOGY_DEVELOPER]: '1',
  [NETWORK]: '20',
  [PROCESSOR]: '10',
  [RECYCLER]: '20',
  [WASTE_GENERATOR]: '30',
};

const generateParticipants = () => {
  const massIDActorParticipants = new Map(
    MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
      subtype,
      stubParticipant({ id: faker.string.uuid(), type: subtype }),
    ]),
  );

  const methodologyActorParticipants = new Map(
    METHODOLOGY_ACTOR_PARTICIPANTS.map((subtype) => [
      subtype,
      stubParticipant({ id: faker.string.uuid(), type: subtype }),
    ]),
  );

  return { massIDActorParticipants, methodologyActorParticipants };
};

const { massIDActorParticipants, methodologyActorParticipants } =
  generateParticipants();

const createStandardRewardsDistribution = (
  documentId: string,
): RewardsDistributionResultContent => ({
  massIDDocumentId: documentId,
  massIDRewards: [
    ...massIDActorParticipants.entries(),
    ...methodologyActorParticipants.entries(),
  ].map(([actorType, participant]) => ({
    actorType,
    address: {
      id: faker.string.uuid(),
    },
    massIDPercentage: STANDARD_REWARDS_DISTRIBUTION[actorType],
    participant: {
      id: participant.id,
      name: participant.name,
    },
  })) as unknown as NonEmptyArray<RewardsDistributionMassIDReward>,
});

const createMethodologyActorReward = (
  actorType: RewardsDistributionActorType,
  percentage: string,
) => {
  const id =
    methodologyActorParticipants.get(
      actorType as unknown as BoldMethodologyActorType,
    )?.id || faker.string.uuid();

  const name =
    methodologyActorParticipants.get(
      actorType as unknown as BoldMethodologyActorType,
    )?.name || `${actorType} Participant`;

  return {
    actorType,
    address: {
      id: faker.string.uuid(),
    },
    massIDPercentage: percentage,
    participant: {
      id,
      name,
    },
  };
};

const createMassIDActorReward = (
  actorType: RewardsDistributionActorType,
  percentage: string,
) => {
  const id =
    massIDActorParticipants.get(actorType as unknown as MassIDActorType)?.id ||
    faker.string.uuid();

  const name =
    massIDActorParticipants.get(actorType as unknown as MassIDActorType)
      ?.name || `${actorType} Participant`;

  return {
    actorType,
    address: {
      id: faker.string.uuid(),
    },
    massIDPercentage: percentage,
    participant: {
      id,
      name,
    },
  };
};

const createMultiHaulerRewardsDistribution = (
  documentId: string,
): RewardsDistributionResultContent => {
  const haulerParticipants = [
    {
      id: 'hauler-participant-tera',
      name: 'Tera',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][0],
    },
    {
      id: 'hauler-participant-transport-y',
      name: 'Transport Y',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][1],
    },
    {
      id: 'hauler-participant-transport-x',
      name: 'Transport X',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][2],
    },
  ];

  const createHaulerRewards = () =>
    haulerParticipants.map(({ id, name, percentage }) => ({
      actorType: RewardsDistributionActorType.HAULER,
      address: {
        id: faker.string.uuid(),
      },
      massIDPercentage: percentage,
      participant: { id, name },
    }));

  const massIDRewards = [
    ...createHaulerRewards(),
    createMassIDActorReward(
      WASTE_GENERATOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[WASTE_GENERATOR],
    ),
    createMassIDActorReward(
      PROCESSOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[PROCESSOR],
    ),
    createMassIDActorReward(
      RECYCLER,
      MULTI_HAULER_REWARDS_DISTRIBUTION[RECYCLER],
    ),
    createMassIDActorReward(
      INTEGRATOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[INTEGRATOR],
    ),
    createMassIDActorReward(
      COMMUNITY_IMPACT_POOL,
      MULTI_HAULER_REWARDS_DISTRIBUTION[COMMUNITY_IMPACT_POOL],
    ),
    createMethodologyActorReward(
      METHODOLOGY_AUTHOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[METHODOLOGY_AUTHOR],
    ),
    createMethodologyActorReward(
      METHODOLOGY_DEVELOPER,
      MULTI_HAULER_REWARDS_DISTRIBUTION[METHODOLOGY_DEVELOPER],
    ),
    createMethodologyActorReward(
      NETWORK,
      MULTI_HAULER_REWARDS_DISTRIBUTION[NETWORK],
    ),
  ] as unknown as NonEmptyArray<RewardsDistributionMassIDReward>;

  return {
    massIDDocumentId: documentId,
    massIDRewards,
  };
};

const buildCertificateDocuments = (options: {
  massIDDocumentId: string;
  rewardsDistribution: RewardsDistributionResultContent;
  value: number;
}) => {
  const { massIDDocumentId, rewardsDistribution, value } = options;

  return new BoldStubsBuilder({
    massIDActorParticipants,
    massIDDocumentIds: [massIDDocumentId],
    methodologyName: BoldMethodologyName.RECYCLING,
  })
    .createMassIDDocuments({
      partialDocument: {
        subtype: FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
    })
    .createMassIDAuditDocuments()
    .createMassIDCertificateDocuments({
      externalEventsMap: {
        [REWARDS_DISTRIBUTION_RULE_SLUG]:
          stubBoldCertificateRewardsDistributionMetadataEvent({
            metadataAttributes: [
              [RULE_RESULT_DETAILS, rewardsDistribution as AnyObject],
            ],
          }),
      },
      partialDocument: {
        currentValue: value,
        type: RECYCLED_ID,
      },
    })
    .createCreditOrderDocument({
      externalEventsMap: {
        [CREDITS_EVENT_NAME]: stubBoldCreditOrderCreditsEvent({
          metadataAttributes: [[CREDIT_UNIT_PRICE, UNIT_PRICE_VALUE]],
        }),
      },
    })
    .build();
};

const createTestDocuments = () => {
  const massID1Value = 1000;
  const massID1DocumentId = faker.string.uuid();

  const standardDocuments = buildCertificateDocuments({
    massIDDocumentId: massID1DocumentId,
    rewardsDistribution: createStandardRewardsDistribution(massID1DocumentId),
    value: massID1Value,
  });

  const multiHaulerDocuments = buildCertificateDocuments({
    massIDDocumentId: massID1DocumentId,
    rewardsDistribution:
      createMultiHaulerRewardsDistribution(massID1DocumentId),
    value: massID1Value,
  });

  const massID2Value = 500;
  const massID2DocumentId = faker.string.uuid();
  const secondDocuments = buildCertificateDocuments({
    massIDDocumentId: massID2DocumentId,
    rewardsDistribution: createStandardRewardsDistribution(massID2DocumentId),
    value: massID2Value,
  });

  const combinedValue = massID1Value + massID2Value;

  const multipleCertificateDocuments = [
    ...standardDocuments.massIDCertificateDocuments,
    ...secondDocuments.massIDCertificateDocuments,
  ];

  const multipleCertificatesCreditOrderDocument = {
    ...standardDocuments.creditOrderDocument,
    externalEvents: [
      ...(standardDocuments.creditOrderDocument.externalEvents ?? []),
      stubDocumentEvent({
        name: RELATED,
        relatedDocument: mapDocumentRelation(
          secondDocuments.massIDCertificateDocuments[0]!,
        ),
      }),
    ],
  };

  return {
    massID1Value,
    massID2Value,
    multiHauler: multiHaulerDocuments,
    multipleCertificates: {
      creditOrderDocument: multipleCertificatesCreditOrderDocument,
      massIDCertificateDocuments: multipleCertificateDocuments,
      totalValue: combinedValue,
    },
    secondDocument: secondDocuments,
    standard: standardDocuments,
  };
};

const documents = createTestDocuments();

// Compact helper: each tuple is [actorType, amount, percentage]. Collapses a
// 5-line object literal into a single line and removes the structural
// duplication that cross-fixture `{ actorType, amount, percentage }` object
// literals create in Sonar's duplication metric.
type ActorResultTuple = [ActorResult['actorType'], string, string];

const toActorResults = (tuples: readonly ActorResultTuple[]): ActorResult[] =>
  tuples.map(([actorType, amount, percentage]) => ({
    actorType,
    amount,
    percentage,
  }));

const expectedResults = {
  multipleCertificates: toActorResults([
    [RewardsDistributionActorType.WASTE_GENERATOR, '34.49925', '15'],
    [RewardsDistributionActorType.HAULER, '22.9995', '10'],
    [RewardsDistributionActorType.PROCESSOR, '22.9995', '10'],
    [RewardsDistributionActorType.RECYCLER, '45.999', '20'],
    [RewardsDistributionActorType.COMMUNITY_IMPACT_POOL, '34.49925', '15'],
    [RewardsDistributionActorType.INTEGRATOR, '18.3996', '8'],
    [RewardsDistributionActorType.METHODOLOGY_AUTHOR, '2.29995', '1'],
    [RewardsDistributionActorType.METHODOLOGY_DEVELOPER, '2.29995', '1'],
    [RewardsDistributionActorType.NETWORK, '45.999', '20'],
    [BoldActorType.REMAINDER, '0', '0'],
  ]),

  // Haulers sorted by participant.id: tera < transport-x < transport-y
  multipleHaulers: toActorResults([
    [RewardsDistributionActorType.WASTE_GENERATOR, '45.999', '30'],
    [RewardsDistributionActorType.HAULER, '5.110999', '3.333332'],
    [RewardsDistributionActorType.HAULER, '5.111001', '3.333333'],
    [RewardsDistributionActorType.HAULER, '5.110999', '3.333332'],
    [RewardsDistributionActorType.PROCESSOR, '15.333', '10'],
    [RewardsDistributionActorType.RECYCLER, '30.666', '20'],
    [RewardsDistributionActorType.COMMUNITY_IMPACT_POOL, '0', '0'],
    [RewardsDistributionActorType.INTEGRATOR, '12.2664', '8'],
    [RewardsDistributionActorType.METHODOLOGY_AUTHOR, '1.5333', '1'],
    [RewardsDistributionActorType.METHODOLOGY_DEVELOPER, '1.5333', '1'],
    [RewardsDistributionActorType.NETWORK, '30.666001', '20.000003'],
    [BoldActorType.REMAINDER, '0.000001', '0.000003'],
  ]),

  singleCertificateStandard: toActorResults([
    [RewardsDistributionActorType.WASTE_GENERATOR, '22.9995', '15'],
    [RewardsDistributionActorType.HAULER, '15.333', '10'],
    [RewardsDistributionActorType.PROCESSOR, '15.333', '10'],
    [RewardsDistributionActorType.RECYCLER, '30.666', '20'],
    [RewardsDistributionActorType.COMMUNITY_IMPACT_POOL, '22.9995', '15'],
    [RewardsDistributionActorType.INTEGRATOR, '12.2664', '8'],
    [RewardsDistributionActorType.METHODOLOGY_AUTHOR, '1.5333', '1'],
    [RewardsDistributionActorType.METHODOLOGY_DEVELOPER, '1.5333', '1'],
    [RewardsDistributionActorType.NETWORK, '30.666', '20'],
    [BoldActorType.REMAINDER, '0', '0'],
  ]),
};

export const rewardsDistributionProcessorTestCases: TestCase[] = [
  {
    creditOrderDocument: documents.standard.creditOrderDocument,
    expectedActorsResult: expectedResults.singleCertificateStandard,
    expectedCertificateTotalValue: documents.massID1Value,
    massIDCertificateDocuments: documents.standard.massIDCertificateDocuments,
    resultStatus: 'PASSED',
    scenario: 'single certificate with equal distribution',
    unitPrice: UNIT_PRICE_VALUE,
  },
  {
    creditOrderDocument: documents.multiHauler.creditOrderDocument,
    expectedActorsResult: expectedResults.multipleHaulers,
    expectedCertificateTotalValue: documents.massID1Value,
    massIDCertificateDocuments:
      documents.multiHauler.massIDCertificateDocuments,
    resultStatus: 'PASSED',
    scenario: 'single certificate with multiple HAULER participants',
    unitPrice: UNIT_PRICE_VALUE,
  },
  {
    creditOrderDocument: documents.multipleCertificates.creditOrderDocument,
    expectedActorsResult: expectedResults.multipleCertificates,
    expectedCertificateTotalValue: documents.multipleCertificates.totalValue,
    massIDCertificateDocuments:
      documents.multipleCertificates.massIDCertificateDocuments,
    resultStatus: 'PASSED',
    scenario: 'multiple certificates with the same participants',
    unitPrice: UNIT_PRICE_VALUE,
  },
];

const createErrorTestCases = () => {
  const errorStubs = new BoldStubsBuilder()
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .createMassIDCertificateDocuments({
      partialDocument: {
        type: RECYCLED_ID,
      },
    })
    .createCreditOrderDocument()
    .build();

  const creditOrderDocumentWithoutCreditsEvent = {
    ...errorStubs.creditOrderDocument,
    externalEvents: errorStubs.creditOrderDocument.externalEvents?.filter(
      (event) => event.name !== CREDITS_EVENT_NAME,
    ),
  };

  const certificateDocumentWithoutRuleEvent = {
    ...errorStubs.massIDCertificateDocuments[0]!,
    externalEvents:
      errorStubs.massIDCertificateDocuments[0]!.externalEvents?.filter(
        (event) => event.name !== REWARDS_DISTRIBUTION_RULE_SLUG,
      ),
  };

  return {
    certificateDocumentWithoutRulesMetadata:
      certificateDocumentWithoutRuleEvent,
    creditOrderDocumentWithoutRulesMetadata:
      creditOrderDocumentWithoutCreditsEvent,
    errorStubs,
  };
};

const errorTestData = createErrorTestCases();

export const rewardsDistributionProcessorErrors: ErrorTestCase[] = [
  {
    creditOrderDocument: errorTestData.errorStubs.creditOrderDocument,
    massIDCertificateDocuments: [],
    resultComment: ERROR_MESSAGES.CERTIFICATE_DOCUMENT_NOT_FOUND(RECYCLED_ID),
    resultStatus: 'FAILED',
    scenario: `the ${RECYCLED_ID} documents is not found`,
  },
  {
    creditOrderDocument: undefined,
    massIDCertificateDocuments: [
      ...errorTestData.errorStubs.massIDCertificateDocuments,
    ],
    resultComment: ERROR_MESSAGES.CREDIT_ORDER_DOCUMENT_NOT_FOUND,
    resultStatus: 'FAILED',
    scenario: `the ${CREDIT_ORDER} document is not found`,
  },
  {
    creditOrderDocument: errorTestData.creditOrderDocumentWithoutRulesMetadata,
    massIDCertificateDocuments: [
      ...errorTestData.errorStubs.massIDCertificateDocuments,
    ],
    resultComment: ERROR_MESSAGES.INVALID_CREDIT_UNIT_PRICE,
    resultStatus: 'FAILED',
    scenario: `the "${CREDIT_UNIT_PRICE}" attribute in the ${CREDIT_ORDER} document is invalid`,
  },
  {
    creditOrderDocument: errorTestData.errorStubs.creditOrderDocument,
    massIDCertificateDocuments: [
      errorTestData.certificateDocumentWithoutRulesMetadata,
    ],
    resultComment:
      ERROR_MESSAGES.REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND(
        errorTestData.errorStubs.massIDCertificateDocuments[0]!.id,
      ),
    resultStatus: 'FAILED',
    scenario: `a certificate document has no "${RULE_RESULT_DETAILS}" attribute`,
  },
];
