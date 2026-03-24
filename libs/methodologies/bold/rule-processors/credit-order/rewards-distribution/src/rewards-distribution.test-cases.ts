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
  type CertificateRewardDistributionOutput,
  type Document,
  MassIDDocumentActorType,
  type MassIDReward,
  MethodologyDocumentActorType,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { faker } from '@faker-js/faker';

import { ERROR_MESSAGES } from './rewards-distribution.errors';

type ActorResult = {
  actorType: 'Remainder' | RewardsDistributionActorType;
  amount: string;
  percentage: string;
};

type CertificateDocument = Document;
type CreditOrderDocument = Document;

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

const UNIT_PRICE_VALUE = 0.153_33;

const DEFAULT_REWARDS = {
  ['Community Impact Pool']: '0',
  ['Integrator']: '8',
  ['Methodology Author']: '1',
  ['Methodology Developer']: '1',
};

const STANDARD_REWARDS_DISTRIBUTION = {
  ['Hauler']: '10',
  ['Network']: '20',
  ['Processor']: '10',
  ['Recycler']: '20',
  ['Waste Generator']: '15',
  ...DEFAULT_REWARDS,
  ['Community Impact Pool']: '15',
};

const MULTI_HAULER_REWARDS_DISTRIBUTION = {
  ['Community Impact Pool']: '0',
  ['Hauler']: ['3.333333', '3.333333', '3.333334'],
  ['Integrator']: '8',
  ['Methodology Author']: '1',
  ['Methodology Developer']: '1',
  ['Network']: '20',
  ['Processor']: '10',
  ['Recycler']: '20',
  ['Waste Generator']: '30',
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
): CertificateRewardDistributionOutput => ({
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
  })) as unknown as NonEmptyArray<MassIDReward>,
});

const createMethodologyActorReward = (
  actorType: RewardsDistributionActorType,
  percentage: string,
) => {
  const id =
    methodologyActorParticipants.get(
      actorType as unknown as MethodologyDocumentActorType,
    )?.id || faker.string.uuid();

  const name =
    methodologyActorParticipants.get(
      actorType as unknown as MethodologyDocumentActorType,
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
    massIDActorParticipants.get(actorType as unknown as MassIDDocumentActorType)
      ?.id || faker.string.uuid();

  const name =
    massIDActorParticipants.get(actorType as unknown as MassIDDocumentActorType)
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
): CertificateRewardDistributionOutput => {
  const haulerParticipants = [
    {
      id:
        massIDActorParticipants.get(
          RewardsDistributionActorType.Hauler as unknown as MassIDDocumentActorType,
        )?.id ?? '',
      name: 'Tera',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION['Hauler'][0],
    },
    {
      id: faker.string.uuid(),
      name: 'Transport Y',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION['Hauler'][1],
    },
    {
      id: faker.string.uuid(),
      name: 'Transport X',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION['Hauler'][2],
    },
  ];

  const createHaulerRewards = () =>
    haulerParticipants.map(({ id, name, percentage }) => ({
      actorType: RewardsDistributionActorType.Hauler,
      address: {
        id: faker.string.uuid(),
      },
      massIDPercentage: percentage,
      participant: { id, name },
    }));

  const massIDRewards = [
    ...createHaulerRewards(),
    createMassIDActorReward(
      RewardsDistributionActorType['Waste Generator'],
      MULTI_HAULER_REWARDS_DISTRIBUTION['Waste Generator'],
    ),
    createMassIDActorReward(
      RewardsDistributionActorType.Processor,
      MULTI_HAULER_REWARDS_DISTRIBUTION['Processor'],
    ),
    createMassIDActorReward(
      RewardsDistributionActorType.Recycler,
      MULTI_HAULER_REWARDS_DISTRIBUTION['Recycler'],
    ),
    createMassIDActorReward(
      RewardsDistributionActorType.Integrator,
      MULTI_HAULER_REWARDS_DISTRIBUTION['Integrator'],
    ),
    createMassIDActorReward(
      RewardsDistributionActorType['Community Impact Pool'],
      MULTI_HAULER_REWARDS_DISTRIBUTION['Community Impact Pool'],
    ),
    createMethodologyActorReward(
      RewardsDistributionActorType['Methodology Author'],
      MULTI_HAULER_REWARDS_DISTRIBUTION['Methodology Author'],
    ),
    createMethodologyActorReward(
      RewardsDistributionActorType['Methodology Developer'],
      MULTI_HAULER_REWARDS_DISTRIBUTION['Methodology Developer'],
    ),
    createMethodologyActorReward(
      RewardsDistributionActorType.Network,
      MULTI_HAULER_REWARDS_DISTRIBUTION['Network'],
    ),
  ] as unknown as NonEmptyArray<MassIDReward>;

  return {
    massIDDocumentId: documentId,
    massIDRewards,
  };
};

const buildCertificateDocuments = (options: {
  massIDDocumentId: string;
  rewardsDistribution: CertificateRewardDistributionOutput;
  value: number;
}) => {
  const { massIDDocumentId, rewardsDistribution, value } = options;

  return new BoldStubsBuilder({
    massIDActorParticipants,
    massIDDocumentIds: [massIDDocumentId],
    methodologyName: 'BOLD Recycling',
  })
    .createMassIDDocuments({
      partialDocument: {
        subtype: 'Food, Food Waste and Beverages',
      },
    })
    .createMassIDAuditDocuments()
    .createMassIDCertificateDocuments({
      externalEventsMap: {
        [REWARDS_DISTRIBUTION_RULE_SLUG]:
          stubBoldCertificateRewardsDistributionMetadataEvent({
            metadataAttributes: [
              ['Rule Result Details', rewardsDistribution as AnyObject],
            ],
          }),
      },
      partialDocument: {
        currentValue: value,
        type: 'RecycledID',
      },
    })
    .createCreditOrderDocument({
      externalEventsMap: {
        [CREDITS_EVENT_NAME]: stubBoldCreditOrderCreditsEvent({
          metadataAttributes: [['Credit Unit Price', UNIT_PRICE_VALUE]],
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
        name: 'RELATED',
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

const expectedResults = {
  multipleCertificates: [
    {
      actorType: RewardsDistributionActorType.Hauler,
      amount: '22.9995',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.Integrator,
      amount: '18.3996',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType.Processor,
      amount: '22.9995',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.Recycler,
      amount: '45.999',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType['Waste Generator'],
      amount: '34.49925',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType['Community Impact Pool'],
      amount: '34.49925',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.Network,
      amount: '45.999',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Author'],
      amount: '2.29995',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Developer'],
      amount: '2.29995',
      percentage: '1',
    },
    {
      actorType: 'Remainder' as const,
      amount: '0',
      percentage: '0',
    },
  ],

  multipleHaulers: [
    {
      actorType: RewardsDistributionActorType.Hauler,
      amount: '5.110999',
      percentage: '3.333332',
    },
    {
      actorType: RewardsDistributionActorType.Hauler,
      amount: '5.110999',
      percentage: '3.333332',
    },
    {
      actorType: RewardsDistributionActorType.Hauler,
      amount: '5.111001',
      percentage: '3.333333',
    },
    {
      actorType: RewardsDistributionActorType['Waste Generator'],
      amount: '45.999',
      percentage: '30',
    },
    {
      actorType: RewardsDistributionActorType.Processor,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.Recycler,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.Integrator,
      amount: '12.2664',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType['Community Impact Pool'],
      amount: '0',
      percentage: '0',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Author'],
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Developer'],
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType.Network,
      amount: '30.666001',
      percentage: '20.000003',
    },
    {
      actorType: 'Remainder' as const,
      amount: '0.000001',
      percentage: '0.000003',
    },
  ],

  singleCertificateStandard: [
    {
      actorType: RewardsDistributionActorType.Hauler,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.Integrator,
      amount: '12.2664',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType.Processor,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.Recycler,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType['Waste Generator'],
      amount: '22.9995',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType['Community Impact Pool'],
      amount: '22.9995',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.Network,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Author'],
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType['Methodology Developer'],
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: 'Remainder' as const,
      amount: '0',
      percentage: '0',
    },
  ],
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
        type: 'RecycledID',
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
    resultComment: ERROR_MESSAGES.CERTIFICATE_DOCUMENT_NOT_FOUND('RecycledID'),
    resultStatus: 'FAILED',
    scenario: 'the RecycledID documents is not found',
  },
  {
    creditOrderDocument: undefined,
    massIDCertificateDocuments: [
      ...errorTestData.errorStubs.massIDCertificateDocuments,
    ],
    resultComment: ERROR_MESSAGES.CREDIT_ORDER_DOCUMENT_NOT_FOUND,
    resultStatus: 'FAILED',
    scenario: 'the Credit Order document is not found',
  },
  {
    creditOrderDocument: errorTestData.creditOrderDocumentWithoutRulesMetadata,
    massIDCertificateDocuments: [
      ...errorTestData.errorStubs.massIDCertificateDocuments,
    ],
    resultComment: ERROR_MESSAGES.INVALID_CREDIT_UNIT_PRICE,
    resultStatus: 'FAILED',
    scenario:
      'the "Credit Unit Price" attribute in the Credit Order document is invalid',
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
    scenario: 'a certificate document has no "Rule Result Details" attribute',
  },
];
