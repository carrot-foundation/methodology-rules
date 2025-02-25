import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  DocumentQueryService,
  spyOnDocumentQueryServiceLoad,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { isActorEventWithSourceActorType } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  stubAddress,
  stubDocument,
  stubDocumentEvent,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type CertificateReward,
  type CertificateRewardDistributionOutput,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
  type RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random, validate } from 'typia';

import {
  REQUIRED_ACTOR_TYPES,
  REWARDS_DISTRIBUTION,
} from './rewards-distribution.constants';
import { formatPercentage } from './rewards-distribution.helpers';
import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import { RewardsDistributionProcessorErrors } from './rewards-distribution.processor.errors';
import {
  requiredMassActorEvents,
  requiredMethodologyActorsEvents,
  stubMassDocumentWithRequiredActors,
  stubMethodologyWithRequiredActors,
} from './rewards-distribution.stubs';

const requiredActorEvents = [
  ...requiredMethodologyActorsEvents,
  ...requiredMassActorEvents,
].sort((a, b) =>
  a.metadata!.attributes![0]!.value! > b.metadata!.attributes![0]!.value!
    ? 1
    : -1,
);

const {
  APPOINTED_NGO,
  METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER,
  NETWORK,
  SOURCE,
} = DocumentEventActorType;

const ALL_ACTOR_TYPES = [
  ...REQUIRED_ACTOR_TYPES.MASS,
  APPOINTED_NGO,
  METHODOLOGY_DEVELOPER,
  METHODOLOGY_AUTHOR,
  NETWORK,
];

const NETWORK_REWARD_DISTRIBUTION_WASTE_NOT_IDENTIFIED = {
  WITH_HAULER: BigNumber(60),
  WITHOUT_HAULER: BigNumber(67.5),
};

const requiredActorEventsWithNoWasteOriginIdentified =
  requiredMassActorEvents.map((actorEvent) => {
    if (isActorEventWithSourceActorType(actorEvent)) {
      return {
        ...actorEvent,
        metadata: {
          attributes: [
            ...(actorEvent.metadata?.attributes ?? []),
            {
              isPublic: faker.datatype.boolean(),
              name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
              value: false,
            },
          ],
        },
      };
    }

    return actorEvent;
  });

const fiftyPercentageDiscount = (value: BigNumber): BigNumber =>
  value.multipliedBy('0.5');

describe('RewardsDistributionProcessor', () => {
  const service = new RewardsDistributionProcessor();
  const errorProcessor = new RewardsDistributionProcessorErrors();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return "REJECTED" when Mass documents is not found', async () => {
    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), []);

    const result = await service.process(data);

    expect(result).toMatchObject({
      resultComment: errorProcessor.ERROR_MESSAGE.MASS_DOCUMENTS_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });

  it('should return "REJECTED" when the methodology document does not extist', async () => {
    const documents = [stubMassDocument()];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result).toMatchObject({
      resultComment:
        errorProcessor.ERROR_MESSAGE.METHODOLOGY_DOCUMENT_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });

  it('should return "REJECTED" when the methodology document does not have the required actors', async () => {
    const documents = [
      stubMassDocumentWithRequiredActors({
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
      stubMethodologyDefinitionDocument({
        externalEvents: [],
      }),
    ];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result).toMatchObject({
      resultComment: errorProcessor.ERROR_MESSAGE.REJECTED_BY_ERROR,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });

  it('should return "REJECTED" when mass document does not contain the required actors', async () => {
    const documents = [
      stubMassDocumentWithRequiredActors({
        subtype: DocumentSubtype.INDUSTRIAL_FOOD_WASTE,
      }),
      stubMassDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.ACTOR_TYPE,
                  value: DocumentEventActorType.SOURCE,
                },
              ],
            },
            name: DocumentEventName.ACTOR,
          }),
        ],
      }),
      stubMethodologyWithRequiredActors(),
    ];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result).toMatchObject({
      resultComment: errorProcessor.ERROR_MESSAGE.MISSING_REQUIRED_ACTORS(
        documents[1]?.id as string,
        REQUIRED_ACTOR_TYPES.MASS.filter((actorType) => actorType !== SOURCE),
      ),
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });

  it('should return "REJECTED" when a unknown error is throwed', async () => {
    const data = random<RuleInput>();

    jest
      .spyOn(DocumentQueryService.prototype, 'load')
      .mockRejectedValueOnce(new Error(faker.string.uuid()));

    const result = await service.process(data);

    expect(result).toMatchObject({
      resultComment: errorProcessor.ERROR_MESSAGE.REJECTED_BY_ERROR,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });

  it.each([
    {
      document: { ...stubMassDocument(), externalEvents: undefined },
      resultComment: (documentId?: string) =>
        errorProcessor.ERROR_MESSAGE.DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          documentId as string,
        ),
      scenario: 'the document does not contain events',
    },
    {
      document: stubMassDocumentWithRequiredActors({
        subtype: faker.string.uuid(),
      }),
      resultComment: () =>
        errorProcessor.ERROR_MESSAGE.UNEXPECTED_DOCUMENT_SUBTYPE,
      scenario: 'document subtype is unknown',
    },
  ])(
    'should return "REJECTED" when $scenario',
    async ({ document, resultComment }) => {
      const data = random<RuleInput>();

      spyOnDocumentQueryServiceLoad(stubDocument(), [
        document,
        stubMethodologyWithRequiredActors(),
      ]);

      const result = await service.process(data);

      expect(result).toMatchObject({
        resultComment: resultComment(document.id),
        resultStatus: RuleOutputStatus.REJECTED,
      });
    },
  );

  it('should return "APPROVED" with certificateRewards and massRewards', async () => {
    const massDocuments = stubArray(() =>
      stubMassDocumentWithRequiredActors({
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
    );

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      ...massDocuments,
      stubMethodologyWithRequiredActors(),
    ]);

    const result = await service.process(data);

    const totalPercentageOfCertificateOfMassRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).massRewards.map(
        ({ massCertificatePercentage }) =>
          new BigNumber(massCertificatePercentage),
      ),
    );

    const totalPercentageOfCertificateOfCertificateReward = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).certificateRewards.map(({ percentage }) => new BigNumber(percentage)),
    );

    expect(result.resultStatus).toBe(RuleOutputStatus.APPROVED);

    expect(result.resultContent).toMatchObject({
      certificateRewards: expect.arrayContaining(
        requiredActorEvents.map((actorEvent) => {
          const actorType = getEventAttributeValue(
            actorEvent,
            DocumentEventAttributeName.ACTOR_TYPE,
          );

          return {
            actorType,
            participant: {
              id: actorEvent.participant.id,
              name: actorEvent.participant.name,
            },
            percentage: expect.stringMatching(/^\d+(\.\d{8}$)?/),
          };
        }),
      ),
      massRewards: massDocuments.flatMap((document) =>
        requiredActorEvents.flatMap((actorEvent) => {
          const type = getEventAttributeValue(
            actorEvent,
            DocumentEventAttributeName.ACTOR_TYPE,
          );

          return {
            actorType: type,
            documentId: document.id,
            massCertificatePercentage: expect.any(String),
            massPercentage: expect.any(String),
            participant: {
              id: actorEvent.participant.id,
              name: actorEvent.participant.name,
            },
          };
        }),
      ),
    });
    expect(totalPercentageOfCertificateOfCertificateReward.toString()).toBe(
      totalPercentageOfCertificateOfMassRewards.toString(),
    );
    expect(
      Math.round(totalPercentageOfCertificateOfCertificateReward.toNumber()),
    ).toBe(100);
  });

  it('should apply mass origin identification rule and return correct rewards', async () => {
    const documents = [
      stubMassDocument({
        externalEvents: requiredActorEventsWithNoWasteOriginIdentified,
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
      stubMethodologyWithRequiredActors(),
    ];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result.resultStatus).toBe(RuleOutputStatus.APPROVED);

    const totalPercentageOfCertificateMassRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).massRewards.map(
        ({ massCertificatePercentage }) =>
          new BigNumber(massCertificatePercentage),
      ),
    );

    const totalPercentageOfCertificateRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).certificateRewards.map(({ percentage }) => new BigNumber(percentage)),
    );

    expect(totalPercentageOfCertificateMassRewards.toString()).toBe(
      totalPercentageOfCertificateRewards.toString(),
    );
    expect(Math.round(totalPercentageOfCertificateRewards.toNumber())).toBe(
      100,
    );

    const networkReward = (
      result.resultContent as CertificateRewardDistributionOutput
    ).massRewards.find(
      ({ actorType }) => actorType === DocumentEventActorType.NETWORK,
    );

    expect(networkReward?.massPercentage).toBe('67.5'); // NETWORK + SOURCE (100%) + HAULER (100%) + RECYCLER (25%) + PROCESSOR (25%)
  });

  it('should apply mass origin identification rule and return correct rewards when there is HAULER actor', async () => {
    const actorEvents = [
      ...requiredActorEventsWithNoWasteOriginIdentified,
      stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: faker.datatype.boolean(),
              name: DocumentEventAttributeName.ACTOR_TYPE,
              value: DocumentEventActorType.HAULER,
            },
          ],
        },
        name: DocumentEventName.ACTOR,
      }),
    ];

    const documents = [
      stubMassDocument({
        externalEvents: actorEvents,
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
      stubMethodologyWithRequiredActors(),
    ];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result.resultStatus).toBe(RuleOutputStatus.APPROVED);

    const totalPercentageOfMassRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).massRewards.map(({ massPercentage }) => new BigNumber(massPercentage)),
    );

    const totalPercentageCertificateRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).certificateRewards.map(({ percentage }) => new BigNumber(percentage)),
    );

    expect(totalPercentageOfMassRewards.toString()).toBe(
      totalPercentageCertificateRewards.toString(),
    );
    expect(Math.round(totalPercentageCertificateRewards.toNumber())).toBe(100);

    const networkReward = (
      result.resultContent as CertificateRewardDistributionOutput
    ).massRewards.find(
      ({ actorType }) => actorType === DocumentEventActorType.NETWORK,
    );

    expect(networkReward?.massPercentage).toBe(
      NETWORK_REWARD_DISTRIBUTION_WASTE_NOT_IDENTIFIED.WITH_HAULER.toString(),
    ); // NETWORK + SOURCE (100%) + HAULER (25%) + RECYCLER (25%) + PROCESSOR (25%)
  });

  it('should apply mass origin identification rule and return correct rewards for multiple documents', async () => {
    const withNoWasteOriginIdentified = faker.string.uuid();
    const withWasteOriginIdentified = faker.string.uuid();

    const documents = [
      stubMassDocument({
        externalEvents: requiredActorEventsWithNoWasteOriginIdentified,
        id: withNoWasteOriginIdentified,
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
      stubMassDocument({
        externalEvents: requiredActorEvents,
        id: withWasteOriginIdentified,
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
      stubMethodologyWithRequiredActors(),
    ];

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), documents);

    const result = await service.process(data);

    expect(result.resultStatus).toBe(RuleOutputStatus.APPROVED);

    const totalPercentOfCertificateMassReward = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).massRewards.map(
        ({ massCertificatePercentage }) =>
          new BigNumber(massCertificatePercentage),
      ),
    );

    const totalPercentageOfCertificateRewards = sumBigNumbers(
      (
        result.resultContent as CertificateRewardDistributionOutput
      ).certificateRewards.map(({ percentage }) => new BigNumber(percentage)),
    );

    expect(totalPercentOfCertificateMassReward.toString()).toBe(
      totalPercentageOfCertificateRewards.toString(),
    );

    expect(Math.round(totalPercentageOfCertificateRewards.toNumber())).toBe(
      100,
    );

    const networkParticipantOfWasteNotIdentified = (
      result.resultContent as CertificateRewardDistributionOutput
    ).massRewards.find(
      ({ actorType, documentId }) =>
        actorType === DocumentEventActorType.NETWORK &&
        documentId === withNoWasteOriginIdentified,
    );

    const networkParticipantOfWasteIdentified = (
      result.resultContent as CertificateRewardDistributionOutput
    ).massRewards.find(
      ({ actorType, documentId }) =>
        actorType === DocumentEventActorType.NETWORK &&
        documentId === withWasteOriginIdentified,
    );

    expect(networkParticipantOfWasteNotIdentified?.massPercentage).toBe(
      NETWORK_REWARD_DISTRIBUTION_WASTE_NOT_IDENTIFIED.WITHOUT_HAULER.toString(),
    ); // NETWORK + SOURCE (100%) + HAULER (100%) + RECYCLER (25%) + PROCESSOR (25%)

    expect(networkParticipantOfWasteIdentified?.massPercentage).toBe(
      REWARDS_DISTRIBUTION.SLUDGE.NETWORK.multipliedBy(100).toString(),
    ); // ONLY NETWORK
  });

  it.each([
    {
      rewardDistribution: REWARDS_DISTRIBUTION.OTHER_ORGANIC_WASTE,
      subtype: DocumentSubtype.AGRO_INDUSTRIAL,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.OTHER_ORGANIC_WASTE,
      subtype: DocumentSubtype.ANIMAL_MANURE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.OTHER_ORGANIC_WASTE,
      subtype: DocumentSubtype.ANIMAL_WASTE_MANAGEMENT,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.SLUDGE,
      subtype: DocumentSubtype.DOMESTIC_SLUDGE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.FOOD_WASTE,
      subtype: DocumentSubtype.FOOD_WASTE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.OTHER_ORGANIC_WASTE,
      subtype: DocumentSubtype.GARDEN_AND_PARK_WASTE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.FOOD_WASTE,
      subtype: DocumentSubtype.INDUSTRIAL_FOOD_WASTE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.SLUDGE,
      subtype: DocumentSubtype.INDUSTRIAL_SLUDGE,
    },
    {
      rewardDistribution: REWARDS_DISTRIBUTION.OTHER_ORGANIC_WASTE,
      subtype: DocumentSubtype.OTHER_NON_DANGEROUS_ORGANICS,
    },
  ])(
    'should return "APPROVED" with certificateRewards and massRewards for $subtype',
    async ({ rewardDistribution, subtype }) => {
      const actorEvents = [
        ...requiredMassActorEvents,
        stubDocumentEvent({
          metadata: {
            attributes: [
              {
                isPublic: faker.datatype.boolean(),
                name: DocumentEventAttributeName.ACTOR_TYPE,
                value: DocumentEventActorType.HAULER,
              },
            ],
          },
          name: DocumentEventName.ACTOR,
        }),
      ];

      const massDocument = stubMassDocument({
        externalEvents: actorEvents,
        subtype: String(subtype),
      });

      const data = random<RuleInput>();

      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massDocument,
        stubMethodologyWithRequiredActors(),
      ]);

      const result = await service.process(data);

      expect(result.resultContent).toMatchObject({
        certificateRewards: expect.arrayContaining(
          actorEvents.map((actorEvent) => {
            const actorType = getEventAttributeValue(
              actorEvent,
              DocumentEventAttributeName.ACTOR_TYPE,
            );

            return {
              actorType,
              participant: {
                id: actorEvent.participant.id,
                name: actorEvent.participant.name,
              },
              percentage: expect.any(String),
            };
          }),
        ),
        massRewards: expect.arrayContaining(
          actorEvents.map((actorEvent) => {
            const actorType = getEventAttributeValue(
              actorEvent,
              DocumentEventAttributeName.ACTOR_TYPE,
            ) as RewardsDistributionActorType;

            return {
              actorType,
              documentId: massDocument.id,
              massCertificatePercentage: expect.any(String),
              massPercentage:
                actorType === SOURCE
                  ? formatPercentage(
                      fiftyPercentageDiscount(rewardDistribution[actorType]),
                    ) // SOURCE (50% of SOURCE percentage) -> APPOINTED_NGO
                  : formatPercentage(rewardDistribution[actorType]),
              participant: {
                id: actorEvent.participant.id,
                name: actorEvent.participant.name,
              },
            };
          }),
        ),
      });
    },
  );

  it('should direct the "HAULER" mass percentage to the "SOURCE" when it is not present', async () => {
    const massDocument = stubMassDocumentWithRequiredActors({
      subtype: DocumentSubtype.FOOD_WASTE,
    });
    const sourceActorEvent = massDocument.externalEvents!.find(
      (event) =>
        getEventAttributeValue(event, DocumentEventAttributeName.ACTOR_TYPE) ===
        SOURCE,
    );

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massDocument,
      stubMethodologyWithRequiredActors({
        externalEvents: requiredMethodologyActorsEvents,
      }),
    ]);

    const result = await service.process(data);

    expect(result.resultContent).toMatchObject({
      massRewards: expect.arrayContaining([
        {
          actorType: SOURCE,
          documentId: massDocument.id,
          massCertificatePercentage: expect.any(String),
          massPercentage: formatPercentage(
            fiftyPercentageDiscount(
              REWARDS_DISTRIBUTION.FOOD_WASTE.SOURCE.plus(
                REWARDS_DISTRIBUTION.FOOD_WASTE.HAULER,
              ), // SOURCE (50% of SOURCE percentage) -> APPOINTED_NGO
            ),
          ),
          participant: {
            id: sourceActorEvent?.participant.id,
            name: sourceActorEvent?.participant.name,
          },
        },
      ]),
    });
  });

  it('should divide the percentage when there is more than one participant of the same type', async () => {
    const processorActorEvent = stubDocumentEvent({
      metadata: {
        attributes: [
          {
            isPublic: faker.datatype.boolean(),
            name: DocumentEventAttributeName.ACTOR_TYPE,
            value: DocumentEventActorType.PROCESSOR,
          },
        ],
      },
      name: DocumentEventName.ACTOR,
    });
    const massDocument = stubMassDocument({
      externalEvents: [...requiredActorEvents, processorActorEvent],
      subtype: DocumentSubtype.FOOD_WASTE,
    });

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massDocument,
      stubMethodologyWithRequiredActors(),
    ]);

    const result = await service.process(data);

    const expectedProcessorMassRewards = (
      result.resultContent as CertificateRewardDistributionOutput
    ).massRewards.filter(
      ({ actorType }) => actorType === DocumentEventActorType.PROCESSOR,
    );

    expect(expectedProcessorMassRewards).toHaveLength(2);
    expect(result.resultContent).toMatchObject({
      massRewards: expect.arrayContaining([
        {
          actorType: DocumentEventActorType.PROCESSOR,
          documentId: massDocument.id,
          massCertificatePercentage: expect.any(String),
          massPercentage: formatPercentage(
            REWARDS_DISTRIBUTION.FOOD_WASTE.PROCESSOR.dividedBy(2),
          ),
          participant: {
            id: processorActorEvent.participant.id,
            name: processorActorEvent.participant.name,
          },
        },
      ]),
    });
  });

  it('should return rule processor resultContent certificate reward grouped by actor type', async () => {
    const participant = stubParticipant();
    const address = stubAddress();

    const externalEvents = REQUIRED_ACTOR_TYPES.MASS.map((actorType) =>
      stubDocumentEvent({
        address,
        metadata: {
          attributes: [
            {
              isPublic: faker.datatype.boolean(),
              name: DocumentEventAttributeName.ACTOR_TYPE,
              value: String(actorType),
            },
          ],
        },
        name: DocumentEventName.ACTOR,
        participant,
      }),
    );
    const massDocuments = stubArray(() =>
      stubMassDocument({
        externalEvents,
        subtype: DocumentSubtype.FOOD_WASTE,
      }),
    );

    const data = random<RuleInput>();

    spyOnDocumentQueryServiceLoad(stubDocument(), [
      ...massDocuments,
      stubMethodologyWithRequiredActors(),
    ]);

    const result = await service.process(data);

    const certificateRewards = result.resultContent?.['certificateRewards'];

    const validationResult = validate<CertificateReward[]>(certificateRewards);

    expect(validationResult).toPassTypiaValidation();

    expect(certificateRewards).toEqual(
      expect.arrayContaining(
        ALL_ACTOR_TYPES.map((actorType) => ({
          actorType,
          participant: expect.any(Object),
          percentage: expect.stringMatching(/^\d+(\.\d{8}$)?/),
        })),
      ),
    );
  });
});
