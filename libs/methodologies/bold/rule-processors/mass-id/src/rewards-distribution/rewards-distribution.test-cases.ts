import type { PartialDeep } from 'type-fest';

import {
  type BoldExternalEventsObject,
  BoldStubsBuilder,
  stubBoldMassIdPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
  MassIdOrganicSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { REWARDS_DISTRIBUTION_BY_WASTE_TYPE } from './rewards-distribution.constants';
import { ERROR_MESSAGES } from './rewards-distribution.errors';
import { RewardsDistributionWasteType } from './rewards-distribution.types';

const { MASS_ID, METHODOLOGY } = DocumentCategory;
const { PICK_UP } = DocumentEventName;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;
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

const DEFAULT_REWARDS = {
  [APPOINTED_NGO]: '0',
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
    [APPOINTED_NGO]: '15',
  },
  [RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT]: {
    [HAULER]: '5',
    [NETWORK]: '20',
    [PROCESSOR]: '10',
    [RECYCLER]: '30',
    [WASTE_GENERATOR]: '12.5',
    ...DEFAULT_REWARDS,
    [APPOINTED_NGO]: '12.5',
  },
  [RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES]: {
    [HAULER]: '5',
    [NETWORK]: '20',
    [PROCESSOR]: '10',
    [RECYCLER]: '30',
    [WASTE_GENERATOR]: '12.5',
    ...DEFAULT_REWARDS,
    [APPOINTED_NGO]: '12.5',
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

export const rewardsDistributionProcessorTestCases: {
  expectedRewards: Record<string, string>;
  massIdDocumentEvents?: BoldExternalEventsObject | undefined;
  massIdPartialDocument: PartialDeep<Document>;
  resultStatus: RuleOutputStatus;
  scenario: string;
}[] = [
  ...Object.entries(REWARDS_DISTRIBUTION_BY_WASTE_TYPE).map(
    ([wasteType, expectedRewards]) => ({
      // eslint-disable-next-line security/detect-object-injection
      expectedRewards: EXPECTED_REWARDS[expectedRewards],
      massIdDocumentEvents: {},
      massIdPartialDocument: {
        subtype: wasteType,
      },
      resultStatus: RuleOutputStatus.APPROVED,
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
    resultStatus: RuleOutputStatus.APPROVED,
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
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the rewards discount is applied if the origin is not identified and the ${HAULER} actor is present`,
  },
  {
    expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
    massIdDocumentEvents: {},
    massIdPartialDocument: {
      subtype: MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
    },
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `all rewards are applied for the ${REWARDS_DISTRIBUTION_BY_WASTE_TYPE['Food, Food Waste and Beverages']}`,
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
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${MASS_ID} document is not found`,
  },
  {
    documents: [massIdDocument],
    massIdAuditDocument,
    resultComment: ERROR_MESSAGES.METHODOLOGY_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
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
    resultStatus: RuleOutputStatus.REJECTED,
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
    resultComment: ERROR_MESSAGES.REJECTED_BY_ERROR,
    resultStatus: RuleOutputStatus.REJECTED,
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
    resultStatus: RuleOutputStatus.REJECTED,
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
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${MASS_ID} document has an unexpected subtype`,
  },
];
