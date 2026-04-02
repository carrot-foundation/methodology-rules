import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBusinessSizeDeclarationValue,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type {
  RewardsDistributionActor,
  RewardsDistributionActorTypePercentage,
} from './rewards-distribution.types';

import {
  calculateNetworkPercentageForUnidentifiedWasteOrigin,
  getWasteGeneratorAdditionalPercentage,
  shouldApplyLargeBusinessDiscount,
} from './rewards-distribution.helpers';

const { ONBOARDING_DECLARATION } = BoldDocumentEventName;
const { BUSINESS_SIZE_DECLARATION } = BoldAttributeName;
const { LARGE_BUSINESS, SMALL_BUSINESS } = BoldBusinessSizeDeclarationValue;
const { WASTE_GENERATOR } = BoldDocumentSubtype;

describe('shouldApplyLargeBusinessDiscount', () => {
  it('should return true when document is undefined (defaults to Large Business)', () => {
    expect(shouldApplyLargeBusinessDiscount(undefined)).toBe(true);
  });

  it('should return true when document exists but has no ONBOARDING_DECLARATION event', () => {
    const document = new BoldStubsBuilder()
      .createMassIDDocuments()
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(
        new Map([[WASTE_GENERATOR, { externalEventsMap: {} }]]),
      )
      .build()
      .participantsAccreditationDocuments.get(WASTE_GENERATOR)!;

    expect(shouldApplyLargeBusinessDiscount(document)).toBe(true);
  });

  it('should return true when document has ONBOARDING_DECLARATION event with Large Business', () => {
    const document = new BoldStubsBuilder()
      .createMassIDDocuments()
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(
        new Map([
          [
            WASTE_GENERATOR,
            {
              externalEventsMap: {
                [ONBOARDING_DECLARATION]:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: ONBOARDING_DECLARATION,
                    },
                    [[BUSINESS_SIZE_DECLARATION, LARGE_BUSINESS]],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get(WASTE_GENERATOR)!;

    expect(shouldApplyLargeBusinessDiscount(document)).toBe(true);
  });

  it('should return false when document has ONBOARDING_DECLARATION event with Small Business', () => {
    const document = new BoldStubsBuilder()
      .createMassIDDocuments()
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(
        new Map([
          [
            WASTE_GENERATOR,
            {
              externalEventsMap: {
                [ONBOARDING_DECLARATION]:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: ONBOARDING_DECLARATION,
                    },
                    [[BUSINESS_SIZE_DECLARATION, SMALL_BUSINESS]],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get(WASTE_GENERATOR)!;

    expect(shouldApplyLargeBusinessDiscount(document)).toBe(false);
  });

  it('should return true when document has ONBOARDING_DECLARATION event but BUSINESS_SIZE_DECLARATION is missing', () => {
    const document = new BoldStubsBuilder()
      .createMassIDDocuments()
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(
        new Map([
          [
            WASTE_GENERATOR,
            {
              externalEventsMap: {
                [ONBOARDING_DECLARATION]:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: ONBOARDING_DECLARATION,
                    },
                    [],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get(WASTE_GENERATOR)!;

    expect(shouldApplyLargeBusinessDiscount(document)).toBe(true);
  });
});

describe('calculateNetworkPercentageForUnidentifiedWasteOrigin', () => {
  const baseDto = {
    actors: [] as RewardsDistributionActor[],
    actorType: RewardsDistributionActorType.NETWORK,
    additionalPercentage: new BigNumber(0),
    basePercentage: new BigNumber(0.2),
    rewardDistributions: {} as RewardsDistributionActorTypePercentage,
    wasteGeneratorPercentage: new BigNumber(0.3),
  };

  it('should default processor and recycler percentages to zero when missing from rewardDistributions', () => {
    const result =
      calculateNetworkPercentageForUnidentifiedWasteOrigin(baseDto);

    // 0.2 (base) + 0.3 (wasteGenerator) + 0 (additional) + 0*0.25 (processor) + 0*0.25 (recycler)
    expect(result).toEqual(new BigNumber(0.5));
  });

  it('should default hauler percentage to zero when hauler actor is defined but missing from rewardDistributions', () => {
    const haulerActor: RewardsDistributionActor = {
      address: { id: 'address-1' },
      participant: { id: 'participant-1', name: 'Hauler Co' },
      preserveSensitiveData: false,
      type: RewardsDistributionActorType.HAULER,
    };

    const result = calculateNetworkPercentageForUnidentifiedWasteOrigin({
      ...baseDto,
      actors: [haulerActor],
    });

    // 0.2 + 0.3 + 0 + 0*0.25 + 0*0.25 + 0*0.25 (hauler default)
    expect(result).toEqual(new BigNumber(0.5));
  });
});

describe('getWasteGeneratorAdditionalPercentage', () => {
  it('should default hauler percentage to zero when hauler is not defined and missing from rewardDistributions', () => {
    const result = getWasteGeneratorAdditionalPercentage(
      [],
      {} as RewardsDistributionActorTypePercentage,
    );

    expect(result).toEqual(new BigNumber(0));
  });
});
