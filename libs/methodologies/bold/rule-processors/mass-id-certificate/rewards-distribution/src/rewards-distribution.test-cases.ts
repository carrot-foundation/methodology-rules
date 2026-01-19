import type { PartialDeep } from 'type-fest';

import {
  type BoldExternalEventsObject,
  BoldStubsBuilder,
  stubBoldMassIdPickUpEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
  DocumentSubtype,
  MassIdOrganicSubtype,
  RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { REWARDS_DISTRIBUTION_BY_WASTE_TYPE } from './rewards-distribution.constants';
import { ERROR_MESSAGES } from './rewards-distribution.errors';

const { MASS_ID, METHODOLOGY } = DocumentCategory;
const { ONBOARDING_DECLARATION, PICK_UP } = DocumentEventName;
const { BUSINESS_SIZE_DECLARATION, WASTE_ORIGIN } = DocumentEventAttributeName;
const { LARGE_BUSINESS, SMALL_BUSINESS, UNIDENTIFIED } =
  DocumentEventAttributeValue;
const { WASTE_GENERATOR: WASTE_GENERATOR_SUBTYPE } = DocumentSubtype;
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

const createWasteGeneratorVerificationDocument = (
  businessSize: DocumentEventAttributeValue,
): Document =>
  ({
    ...new BoldStubsBuilder()
      .createMassIdDocuments()
      .createMassIdAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(
        new Map([
          [
            WASTE_GENERATOR_SUBTYPE,
            {
              externalEventsMap: {
                [ONBOARDING_DECLARATION]:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: ONBOARDING_DECLARATION,
                    },
                    [[BUSINESS_SIZE_DECLARATION, businessSize]],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get(WASTE_GENERATOR_SUBTYPE)!,
  }) as Document;

const DEFAULT_REWARDS = {
  [COMMUNITY_IMPACT_POOL]: '0',
  [INTEGRATOR]: '8',
  [METHODOLOGY_AUTHOR]: '1',
  [METHODOLOGY_DEVELOPER]: '1',
};

const EXPECTED_REWARDS = {
  [RewardsDistributionWasteType.MIXED_ORGANIC_WASTE]: {
    [HAULER]: '10',
    [NETWORK]: '20',
    [PROCESSOR]: '10',
    [RECYCLER]: '20',
    [WASTE_GENERATOR]: '15',
    ...DEFAULT_REWARDS,
    [COMMUNITY_IMPACT_POOL]: '15',
  },
  [RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT]: {
    [HAULER]: '5',
    [NETWORK]: '20',
    [PROCESSOR]: '10',
    [RECYCLER]: '30',
    [WASTE_GENERATOR]: '12.5',
    ...DEFAULT_REWARDS,
    [COMMUNITY_IMPACT_POOL]: '12.5',
  },
  [RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES]: {
    [HAULER]: '5',
    [NETWORK]: '20',
    [PROCESSOR]: '10',
    [RECYCLER]: '30',
    [WASTE_GENERATOR]: '12.5',
    ...DEFAULT_REWARDS,
    [COMMUNITY_IMPACT_POOL]: '12.5',
  },
  SMALL_BUSINESS: {
    [RewardsDistributionWasteType.MIXED_ORGANIC_WASTE]: {
      [HAULER]: '10',
      [NETWORK]: '20',
      [PROCESSOR]: '10',
      [RECYCLER]: '20',
      [WASTE_GENERATOR]: '30',
      ...DEFAULT_REWARDS,
      [COMMUNITY_IMPACT_POOL]: '0',
    },
    [RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT]: {
      [HAULER]: '5',
      [NETWORK]: '20',
      [PROCESSOR]: '10',
      [RECYCLER]: '30',
      [WASTE_GENERATOR]: '25',
      ...DEFAULT_REWARDS,
      [COMMUNITY_IMPACT_POOL]: '0',
    },
    [RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES]: {
      [HAULER]: '5',
      [NETWORK]: '20',
      [PROCESSOR]: '10',
      [RECYCLER]: '30',
      [WASTE_GENERATOR]: '25',
      ...DEFAULT_REWARDS,
      [COMMUNITY_IMPACT_POOL]: '0',
    },
  },
  WITHOUT_WASTE_GENERATOR: {
    WITH_HAULER: {
      [HAULER]: '7.5',
      [NETWORK]: '60',
      [PROCESSOR]: '7.5',
      [RECYCLER]: '15',
      ...DEFAULT_REWARDS,
    },
    WITHOUT_HAULER: {
      [NETWORK]: '67.5',
      [PROCESSOR]: '7.5',
      [RECYCLER]: '15',
      ...DEFAULT_REWARDS,
    },
  },
};

export const rewardsDistributionProcessorTestCases: Array<{
  expectedRewards: Record<string, string>;
  massIdDocumentEvents?: BoldExternalEventsObject | undefined;
  massIdPartialDocument: PartialDeep<Document>;
  resultStatus: RuleOutputStatus;
  scenario: string;
  wasteGeneratorVerificationDocument?: Document | undefined;
}> = [
  ...Object.entries(REWARDS_DISTRIBUTION_BY_WASTE_TYPE).map(
    ([wasteType, expectedRewards]) => ({
      // eslint-disable-next-line security/detect-object-injection
      expectedRewards: EXPECTED_REWARDS[expectedRewards],
      massIdDocumentEvents: {},
      massIdPartialDocument: {
        subtype: wasteType,
      },
      resultStatus: RuleOutputStatus.PASSED,
      scenario: `the massRewards is calculated successfully for ${wasteType} waste type and ${expectedRewards} rewards`,
    }),
  ),
  {
    expectedRewards: EXPECTED_REWARDS.WITHOUT_WASTE_GENERATOR.WITHOUT_HAULER,
    massIdDocumentEvents: {
      [`ACTOR-${HAULER}`]: undefined,
      [`ACTOR-${WASTE_GENERATOR}`]: undefined,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
      }),
    },
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the rewards discount is applied if the origin is not identified and the ${HAULER} actor is not present`,
  },
  {
    expectedRewards: EXPECTED_REWARDS.WITHOUT_WASTE_GENERATOR.WITH_HAULER,
    massIdDocumentEvents: {
      [`ACTOR-${WASTE_GENERATOR}`]: undefined,
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
      }),
    },
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the rewards discount is applied if the origin is not identified and the ${HAULER} actor is present`,
  },
  {
    expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
    massIdDocumentEvents: {},
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `all rewards are applied for the ${REWARDS_DISTRIBUTION_BY_WASTE_TYPE['Food, Food Waste and Beverages']}`,
  },
  {
    expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
    massIdDocumentEvents: {},
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `Large Business discount is applied when Waste Generator Verification Document is missing (defaults to Large Business)`,
  },
  {
    expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
    massIdDocumentEvents: {},
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `Large Business discount is applied when Waste Generator Verification Document indicates Large Business`,
    wasteGeneratorVerificationDocument:
      createWasteGeneratorVerificationDocument(LARGE_BUSINESS),
  },
  {
    expectedRewards:
      EXPECTED_REWARDS.SMALL_BUSINESS[
        RewardsDistributionWasteType.MIXED_ORGANIC_WASTE
      ],
    massIdDocumentEvents: {},
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `no discount is applied when Waste Generator Verification Document indicates Small Business`,
    wasteGeneratorVerificationDocument:
      createWasteGeneratorVerificationDocument(SMALL_BUSINESS),
  },
];

const { massIdAuditDocument, massIdDocument, methodologyDocument } =
  new BoldStubsBuilder()
    .createMassIdDocuments()
    .createMassIdAuditDocuments()
    .createMethodologyDocument()
    .build();

export const rewardsDistributionProcessorErrors = [
  {
    documents: [],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `${MASS_ID} document is not found`,
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.METHODOLOGY_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `${METHODOLOGY} document is not found`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          ({ label }) => label !== RewardsDistributionActorType.INTEGRATOR,
        ),
      },
      methodologyDocument as Document,
    ],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.MISSING_REQUIRED_ACTORS(massIdDocument.id, [
      RewardsDistributionActorType.INTEGRATOR,
    ]),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${MASS_ID} document does not have the required actors`,
  },
  {
    documents: [
      {
        ...methodologyDocument,
        externalEvents: [],
      } as Document,
      massIdDocument,
    ],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.FAILED_BY_ERROR,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${METHODOLOGY} document does not have the required actors`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: [],
      } as Document,
      methodologyDocument as Document,
    ],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.EXTERNAL_EVENTS_NOT_FOUND(massIdDocument.id),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${MASS_ID} document does not have external events`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        subtype: 'unknown',
      } as Document,
      methodologyDocument as Document,
    ],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.UNEXPECTED_DOCUMENT_SUBTYPE('unknown'),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${MASS_ID} document has an unexpected subtype`,
  },
  {
    documents: [
      massIdDocument,
      {
        ...methodologyDocument,
        externalEvents: methodologyDocument?.externalEvents?.map((event) =>
          event.name === String(DocumentEventName.ACTOR)
            ? { ...event, address: undefined }
            : event,
        ),
      } as Document,
    ],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.FAILED_BY_ERROR,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the ${METHODOLOGY} document does not have the required address in actors`,
  },
];
