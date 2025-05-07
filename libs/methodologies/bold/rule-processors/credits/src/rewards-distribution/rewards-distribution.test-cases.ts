import type { AnyObject, NonEmptyArray } from '@carrot-fndn/shared/types';

import {
  BoldStubsBuilder,
  MASS_ID_ACTOR_PARTICIPANTS,
  METHODOLOGY_ACTOR_PARTICIPANTS,
  stubBoldCertificateRulesMetadataEvent,
  stubBoldCreditsRulesMetadataEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
  DocumentType,
  MassIdDocumentActorType,
  type MassIdReward,
  MethodologyDocumentActorType,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyActorType } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { ERROR_MESSAGES } from './rewards-distribution.errors';

type ActorResult = {
  actorType: MethodologyActorType | RewardsDistributionActorType;
  amount: string;
  percentage: string;
};

type CertificateDocument = Document;
type CreditsDocument = Document;

type TestCase = {
  certificateDocuments: CertificateDocument[];
  creditsDocument: CreditsDocument;
  expectedActorsResult: ActorResult[];
  expectedMassIdTotalValue: number;
  resultStatus: RuleOutputStatus;
  scenario: string;
  unitPrice: number;
};

type ErrorTestCase = {
  certificateDocuments: CertificateDocument[];
  creditsDocument: CreditsDocument | undefined;
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
};

const { CREDITS, RECYCLED_ID } = DocumentType;
const { FOOD_FOOD_WASTE_AND_BEVERAGES, TRC } = DocumentSubtype;
const { RELATED, RULES_METADATA } = DocumentEventName;
const { REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT, UNIT_PRICE } =
  DocumentEventAttributeName;
const {
  APPOINTED_NGO,
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
  [APPOINTED_NGO]: '0',
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
  [APPOINTED_NGO]: '15',
};

const MULTI_HAULER_REWARDS_DISTRIBUTION = {
  [APPOINTED_NGO]: '0',
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
  const massIdActorParticipants = new Map(
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

  return { massIdActorParticipants, methodologyActorParticipants };
};

const { massIdActorParticipants, methodologyActorParticipants } =
  generateParticipants();

const createStandardRewardsDistribution = (
  documentId: string,
): CertificateRewardDistributionOutput => ({
  massIdDocumentId: documentId,
  massIdRewards: [
    ...massIdActorParticipants.entries(),
    ...methodologyActorParticipants.entries(),
  ].map(([actorType, participant]) => ({
    actorType,
    massIdPercentage: STANDARD_REWARDS_DISTRIBUTION[actorType],
    participant: {
      id: participant.id,
      name: participant.name,
    },
  })) as unknown as NonEmptyArray<MassIdReward>,
});

const createMethodologyActorReward = (
  actorType: RewardsDistributionActorType,
  percentage: string,
) => ({
  actorType,
  massIdPercentage: percentage,
  participant: {
    id:
      methodologyActorParticipants.get(
        actorType as unknown as MethodologyDocumentActorType,
      )?.id ?? '',
    name:
      methodologyActorParticipants.get(
        actorType as unknown as MethodologyDocumentActorType,
      )?.name ?? '',
  },
});

const createMassIdActorReward = (
  actorType: RewardsDistributionActorType,
  percentage: string,
) => ({
  actorType,
  massIdPercentage: percentage,
  participant: {
    id:
      massIdActorParticipants.get(
        actorType as unknown as MassIdDocumentActorType,
      )?.id ?? '',
    name:
      massIdActorParticipants.get(
        actorType as unknown as MassIdDocumentActorType,
      )?.name ?? '',
  },
});

const createMultiHaulerRewardsDistribution = (
  documentId: string,
): CertificateRewardDistributionOutput => {
  const haulerParticipants = [
    {
      id:
        massIdActorParticipants.get(
          HAULER as unknown as MassIdDocumentActorType,
        )?.id ?? '',
      name: 'Tera',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][0],
    },
    {
      id: faker.string.uuid(),
      name: 'Transport Y',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][1],
    },
    {
      id: faker.string.uuid(),
      name: 'Transport X',
      percentage: MULTI_HAULER_REWARDS_DISTRIBUTION[HAULER][2],
    },
  ];

  const createHaulerRewards = () =>
    haulerParticipants.map(({ id, name, percentage }) => ({
      actorType: RewardsDistributionActorType.HAULER,
      massIdPercentage: percentage,
      participant: { id, name },
    }));

  const massIdRewards = [
    ...createHaulerRewards(),
    createMassIdActorReward(
      WASTE_GENERATOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[WASTE_GENERATOR],
    ),
    createMassIdActorReward(
      PROCESSOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[PROCESSOR],
    ),
    createMassIdActorReward(
      RECYCLER,
      MULTI_HAULER_REWARDS_DISTRIBUTION[RECYCLER],
    ),
    createMassIdActorReward(
      INTEGRATOR,
      MULTI_HAULER_REWARDS_DISTRIBUTION[INTEGRATOR],
    ),
    createMassIdActorReward(
      APPOINTED_NGO,
      MULTI_HAULER_REWARDS_DISTRIBUTION[APPOINTED_NGO],
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
  ] as unknown as NonEmptyArray<MassIdReward>;

  return {
    massIdDocumentId: documentId,
    massIdRewards,
  };
};

const buildCertificateDocuments = (options: {
  documentId: string;
  rewardsDistribution: CertificateRewardDistributionOutput;
  value: number;
}) => {
  const { documentId, rewardsDistribution, value } = options;

  return new BoldStubsBuilder({
    massIdActorParticipants,
    massIdDocumentIds: [documentId],
  })
    .createMassIdDocuments({
      partialDocument: {
        subtype: FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
    })
    .createMassIdAuditDocuments()
    .createCertificateDocuments({
      externalEventsMap: {
        [RULES_METADATA]: stubBoldCertificateRulesMetadataEvent({
          metadataAttributes: [
            [
              REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT,
              rewardsDistribution as AnyObject,
            ],
          ],
        }),
      },
      partialDocument: {
        currentValue: value,
        type: RECYCLED_ID,
      },
    })
    .createCreditsDocument({
      externalEventsMap: {
        [RULES_METADATA]: stubBoldCreditsRulesMetadataEvent({
          metadataAttributes: [[UNIT_PRICE, UNIT_PRICE_VALUE]],
        }),
      },
      partialDocument: {
        subtype: TRC,
      },
    })
    .build();
};

const createTestDocuments = () => {
  const massId1Value = 1000;
  const massId1DocumentId = faker.string.uuid();

  const standardDocuments = buildCertificateDocuments({
    documentId: massId1DocumentId,
    rewardsDistribution: createStandardRewardsDistribution(massId1DocumentId),
    value: massId1Value,
  });

  const multiHaulerDocuments = buildCertificateDocuments({
    documentId: massId1DocumentId,
    rewardsDistribution:
      createMultiHaulerRewardsDistribution(massId1DocumentId),
    value: massId1Value,
  });

  const massId2Value = 500;
  const massId2DocumentId = faker.string.uuid();
  const secondDocuments = buildCertificateDocuments({
    documentId: massId2DocumentId,
    rewardsDistribution: createStandardRewardsDistribution(massId2DocumentId),
    value: massId2Value,
  });

  const combinedValue = massId1Value + massId2Value;

  const multipleCertificateDocuments = [
    ...standardDocuments.certificateDocuments,
    ...secondDocuments.certificateDocuments,
  ];

  const multipleCertificatesCreditsDocument = {
    ...standardDocuments.creditsDocument,
    externalEvents: [
      ...(standardDocuments.creditsDocument.externalEvents ?? []),
      stubDocumentEvent({
        name: RELATED,
        relatedDocument: mapDocumentReference(
          secondDocuments.certificateDocuments[0]!,
        ),
      }),
    ],
  };

  return {
    massId1Value,
    massId2Value,
    multiHauler: multiHaulerDocuments,
    multipleCertificates: {
      certificateDocuments: multipleCertificateDocuments,
      creditsDocument: multipleCertificatesCreditsDocument,
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
      actorType: RewardsDistributionActorType.HAULER,
      amount: '22.9995',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.INTEGRATOR,
      amount: '18.3996',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType.PROCESSOR,
      amount: '22.9995',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.RECYCLER,
      amount: '45.999',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.WASTE_GENERATOR,
      amount: '34.49925',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.APPOINTED_NGO,
      amount: '34.49925',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.NETWORK,
      amount: '45.999',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_AUTHOR,
      amount: '2.29995',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_DEVELOPER,
      amount: '2.29995',
      percentage: '1',
    },
    {
      actorType: MethodologyActorType.REMAINDER,
      amount: '0',
      percentage: '0',
    },
  ] as ActorResult[],

  multipleHaulers: [
    {
      actorType: RewardsDistributionActorType.HAULER,
      amount: '5.110999',
      percentage: '3.333332',
    },
    {
      actorType: RewardsDistributionActorType.HAULER,
      amount: '5.110999',
      percentage: '3.333332',
    },
    {
      actorType: RewardsDistributionActorType.HAULER,
      amount: '5.111001',
      percentage: '3.333333',
    },
    {
      actorType: RewardsDistributionActorType.WASTE_GENERATOR,
      amount: '45.999',
      percentage: '30',
    },
    {
      actorType: RewardsDistributionActorType.PROCESSOR,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.RECYCLER,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.INTEGRATOR,
      amount: '12.2664',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType.APPOINTED_NGO,
      amount: '0',
      percentage: '0',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_AUTHOR,
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_DEVELOPER,
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType.NETWORK,
      amount: '30.666001',
      percentage: '20.000003',
    },
    {
      actorType: MethodologyActorType.REMAINDER,
      amount: '0.000001',
      percentage: '0.000003',
    },
  ] as ActorResult[],

  singleCertificateStandard: [
    {
      actorType: RewardsDistributionActorType.HAULER,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.INTEGRATOR,
      amount: '12.2664',
      percentage: '8',
    },
    {
      actorType: RewardsDistributionActorType.PROCESSOR,
      amount: '15.333',
      percentage: '10',
    },
    {
      actorType: RewardsDistributionActorType.RECYCLER,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.WASTE_GENERATOR,
      amount: '22.9995',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.APPOINTED_NGO,
      amount: '22.9995',
      percentage: '15',
    },
    {
      actorType: RewardsDistributionActorType.NETWORK,
      amount: '30.666',
      percentage: '20',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_AUTHOR,
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: RewardsDistributionActorType.METHODOLOGY_DEVELOPER,
      amount: '1.5333',
      percentage: '1',
    },
    {
      actorType: MethodologyActorType.REMAINDER,
      amount: '0',
      percentage: '0',
    },
  ] as ActorResult[],
};

export const rewardsDistributionProcessorTestCases: TestCase[] = [
  {
    certificateDocuments: documents.standard.certificateDocuments,
    creditsDocument: documents.standard.creditsDocument,
    expectedActorsResult: expectedResults.singleCertificateStandard,
    expectedMassIdTotalValue: documents.massId1Value,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'single certificate with equal distribution',
    unitPrice: UNIT_PRICE_VALUE,
  },
  {
    certificateDocuments: documents.multiHauler.certificateDocuments,
    creditsDocument: documents.multiHauler.creditsDocument,
    expectedActorsResult: expectedResults.multipleHaulers,
    expectedMassIdTotalValue: documents.massId1Value,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'single certificate with multiple HAULER participants',
    unitPrice: UNIT_PRICE_VALUE,
  },
  {
    certificateDocuments: documents.multipleCertificates.certificateDocuments,
    creditsDocument: documents.multipleCertificates.creditsDocument,
    expectedActorsResult: expectedResults.multipleCertificates,
    expectedMassIdTotalValue: documents.multipleCertificates.totalValue,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'multiple certificates with the same participants',
    unitPrice: UNIT_PRICE_VALUE,
  },
];

const createErrorTestCases = () => {
  const errorStubs = new BoldStubsBuilder()
    .createMassIdDocuments()
    .createMassIdAuditDocuments()
    .createCertificateDocuments({
      partialDocument: {
        type: RECYCLED_ID,
      },
    })
    .createCreditsDocument()
    .build();

  const creditsDocumentWithoutRulesMetadata = {
    ...errorStubs.creditsDocument,
    externalEvents: errorStubs.creditsDocument.externalEvents?.filter(
      (event) => event.name !== RULES_METADATA.toString(),
    ),
  };

  const certificateDocumentWithoutRulesMetadata = {
    ...errorStubs.certificateDocuments[0]!,
    externalEvents: errorStubs.certificateDocuments[0]!.externalEvents?.filter(
      (event) => event.name !== RULES_METADATA.toString(),
    ),
  };

  return {
    certificateDocumentWithoutRulesMetadata,
    creditsDocumentWithoutRulesMetadata,
    errorStubs,
  };
};

const errorTestData = createErrorTestCases();

export const rewardsDistributionProcessorErrors: ErrorTestCase[] = [
  {
    certificateDocuments: [],
    creditsDocument: errorTestData.errorStubs.creditsDocument,
    resultComment: ERROR_MESSAGES.CERTIFICATE_DOCUMENT_NOT_FOUND(RECYCLED_ID),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${RECYCLED_ID} documents is not found`,
  },
  {
    certificateDocuments: [...errorTestData.errorStubs.certificateDocuments],
    creditsDocument: undefined,
    resultComment: ERROR_MESSAGES.CREDITS_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${CREDITS} document is not found`,
  },
  {
    certificateDocuments: [...errorTestData.errorStubs.certificateDocuments],
    creditsDocument: errorTestData.creditsDocumentWithoutRulesMetadata,
    resultComment: ERROR_MESSAGES.INVALID_UNIT_PRICE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${UNIT_PRICE}" attribute in the ${CREDITS} document is invalid`,
  },
  {
    certificateDocuments: [
      errorTestData.certificateDocumentWithoutRulesMetadata,
    ],
    creditsDocument: errorTestData.errorStubs.creditsDocument,
    resultComment:
      ERROR_MESSAGES.REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND(
        errorTestData.errorStubs.certificateDocuments[0]!.id,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `a certificate document has no "${REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT}" attribute`,
  },
];
