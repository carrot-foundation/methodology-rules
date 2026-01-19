import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { shouldApplyLargeBusinessDiscount } from './rewards-distribution.helpers';

const { ONBOARDING_DECLARATION } = DocumentEventName;
const { BUSINESS_SIZE_DECLARATION } = DocumentEventAttributeName;
const { LARGE_BUSINESS, SMALL_BUSINESS } = DocumentEventAttributeValue;
const { WASTE_GENERATOR } = DocumentSubtype;

describe('shouldApplyLargeBusinessDiscount', () => {
  it('should return true when document is undefined (defaults to Large Business)', () => {
    expect(shouldApplyLargeBusinessDiscount(undefined)).toBe(true);
  });

  it('should return true when document exists but has no ONBOARDING_DECLARATION event', () => {
    const document = new BoldStubsBuilder()
      .createMassIdDocuments()
      .createMassIdAuditDocuments()
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
      .createMassIdDocuments()
      .createMassIdAuditDocuments()
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
      .createMassIdDocuments()
      .createMassIdAuditDocuments()
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
      .createMassIdDocuments()
      .createMassIdAuditDocuments()
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
