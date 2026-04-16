import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { PartialDeep } from 'type-fest';

import {
  type BoldExternalEventsObject,
  BoldStubsBuilder,
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBusinessSizeDeclarationValue,
  type BoldDocument,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldUnidentifiedAttributeValue,
  MassIDOrganicSubtype,
  RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { REWARDS_DISTRIBUTION_BY_WASTE_TYPE } from './rewards-distribution.constants';
import { ERROR_MESSAGES } from './rewards-distribution.errors';

const { MASS_ID, METHODOLOGY } = BoldDocumentCategory;
const { ACTOR, PICK_UP } = BoldDocumentEventName;
const { WASTE_ORIGIN } = BoldAttributeName;
const { LARGE_BUSINESS, SMALL_BUSINESS } = BoldBusinessSizeDeclarationValue;
const { UNIDENTIFIED } = BoldUnidentifiedAttributeValue;
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

const DEFAULT_REWARDS = {
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
    },
    [RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT]: {
      [HAULER]: '5',
      [NETWORK]: '20',
      [PROCESSOR]: '10',
      [RECYCLER]: '30',
      [WASTE_GENERATOR]: '25',
      ...DEFAULT_REWARDS,
    },
    [RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES]: {
      [HAULER]: '5',
      [NETWORK]: '20',
      [PROCESSOR]: '10',
      [RECYCLER]: '30',
      [WASTE_GENERATOR]: '25',
      ...DEFAULT_REWARDS,
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

interface RewardsDistributionTestCase extends Omit<
  RuleTestCase,
  'resultComment'
> {
  accreditationBusinessSize?: BoldBusinessSizeDeclarationValue | undefined;
  expectedRewards: Record<string, string>;
  massIDDocumentEvents?: BoldExternalEventsObject | undefined;
  massIDPartialDocument: PartialDeep<BoldDocument>;
  resultComment?: string;
}

export const rewardsDistributionProcessorTestCases: RewardsDistributionTestCase[] =
  [
    ...Object.entries(REWARDS_DISTRIBUTION_BY_WASTE_TYPE).map(
      ([wasteType, expectedRewards]) => ({
        expectedRewards: EXPECTED_REWARDS[
          expectedRewards as keyof typeof EXPECTED_REWARDS
        ] as Record<string, string>,
        massIDDocumentEvents: {},
        massIDPartialDocument: {
          subtype: wasteType,
        },
        resultStatus: 'PASSED' as const,
        scenario: `the massRewards is calculated successfully for ${wasteType} waste type and ${expectedRewards} rewards`,
      }),
    ),
    {
      expectedRewards: EXPECTED_REWARDS.WITHOUT_WASTE_GENERATOR.WITHOUT_HAULER,
      massIDDocumentEvents: {
        [`ACTOR-${HAULER}`]: undefined,
        [`ACTOR-${WASTE_GENERATOR}`]: undefined,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
        }),
      },
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `the rewards discount is applied if the origin is not identified and the ${HAULER} actor is not present`,
    },
    {
      expectedRewards: EXPECTED_REWARDS.WITHOUT_WASTE_GENERATOR.WITH_HAULER,
      massIDDocumentEvents: {
        [`ACTOR-${WASTE_GENERATOR}`]: undefined,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
        }),
      },
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `the rewards discount is applied if the origin is not identified and the ${HAULER} actor is present`,
    },
    {
      expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
      massIDDocumentEvents: {},
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `all rewards are applied for the ${REWARDS_DISTRIBUTION_BY_WASTE_TYPE['Food, Food Waste and Beverages']}`,
    },
    {
      expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
      massIDDocumentEvents: {},
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `Large Business discount is applied when Waste Generator Verification Document is missing (defaults to Large Business)`,
    },
    {
      accreditationBusinessSize: LARGE_BUSINESS,
      expectedRewards: EXPECTED_REWARDS['Mixed Organic Waste'],
      massIDDocumentEvents: {},
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `Large Business discount is applied when Waste Generator Verification Document indicates Large Business`,
    },
    {
      accreditationBusinessSize: SMALL_BUSINESS,
      expectedRewards:
        EXPECTED_REWARDS.SMALL_BUSINESS[
          RewardsDistributionWasteType.MIXED_ORGANIC_WASTE
        ],
      massIDDocumentEvents: {},
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `no discount is applied when Waste Generator Verification Document indicates Small Business`,
    },
    {
      accreditationBusinessSize: SMALL_BUSINESS,
      expectedRewards:
        EXPECTED_REWARDS.SMALL_BUSINESS[
          RewardsDistributionWasteType.MIXED_ORGANIC_WASTE
        ],
      massIDDocumentEvents: {},
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED' as const,
      scenario: `regression: a small-business waste generator on a Food/Food Waste and Beverages MassID receives the full generator share and the Community Impact Pool does not receive any redirected share`,
    },
    {
      expectedRewards:
        EXPECTED_REWARDS[RewardsDistributionWasteType.MIXED_ORGANIC_WASTE],
      massIDDocumentEvents: {
        [`${ACTOR}-InvalidActorType`]: stubDocumentEvent({
          label: 'Invalid Actor Type',
          name: ACTOR,
        }),
      },
      massIDPartialDocument: {
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      },
      resultStatus: 'PASSED',
      scenario:
        'actor events with invalid labels are ignored and do not affect rewards calculation',
    },
  ];

const {
  massIDAuditDocument,
  massIDCertificateDocument,
  massIDDocument,
  methodologyDocument,
} = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createMassIDCertificateDocuments()
  .build();

interface RewardsDistributionErrorTestCase extends RuleTestCase {
  documents: BoldDocument[];
  massIDAuditDocument: BoldDocument;
  massIDCertificateDocument: BoldDocument;
}

export const rewardsDistributionProcessorErrors: RewardsDistributionErrorTestCase[] =
  [
    {
      documents: [],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED' as const,
      scenario: `${MASS_ID} document is not found`,
    },
    {
      documents: [massIDDocument],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.METHODOLOGY_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED' as const,
      scenario: `${METHODOLOGY} document is not found`,
    },
    {
      documents: [
        {
          ...massIDDocument,
          externalEvents: massIDDocument.externalEvents?.filter(
            ({ label }) => label !== RewardsDistributionActorType.INTEGRATOR,
          ),
        },
        methodologyDocument as BoldDocument,
      ],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.MISSING_REQUIRED_ACTORS(massIDDocument.id, [
        RewardsDistributionActorType.INTEGRATOR,
      ]),
      resultStatus: 'FAILED' as const,
      scenario: `the ${MASS_ID} document does not have the required actors`,
    },
    {
      documents: [
        {
          ...methodologyDocument,
          externalEvents: [],
        } as BoldDocument,
        massIDDocument,
      ],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.FAILED_BY_ERROR,
      resultStatus: 'FAILED' as const,
      scenario: `the ${METHODOLOGY} document does not have the required actors`,
    },
    {
      documents: [
        {
          ...massIDDocument,
          externalEvents: [],
        } as BoldDocument,
        methodologyDocument as BoldDocument,
      ],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.EXTERNAL_EVENTS_NOT_FOUND(
        massIDDocument.id,
      ),
      resultStatus: 'FAILED' as const,
      scenario: `the ${MASS_ID} document does not have external events`,
    },
    {
      documents: [
        {
          ...massIDDocument,
          subtype: 'unknown',
        } as BoldDocument,
        methodologyDocument as BoldDocument,
      ],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.UNEXPECTED_DOCUMENT_SUBTYPE('unknown'),
      resultStatus: 'FAILED' as const,
      scenario: `the ${MASS_ID} document has an unexpected subtype`,
    },
    {
      documents: [
        massIDDocument,
        {
          ...methodologyDocument,
          externalEvents: methodologyDocument?.externalEvents?.map((event) =>
            event.name === String(BoldDocumentEventName.ACTOR)
              ? { ...event, address: undefined }
              : event,
          ),
        } as BoldDocument,
      ],
      massIDAuditDocument,
      massIDCertificateDocument,
      resultComment: ERROR_MESSAGES.FAILED_BY_ERROR,
      resultStatus: 'FAILED' as const,
      scenario: `the ${METHODOLOGY} document does not have the required address in actors`,
    },
  ];
