import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';

import { shouldApplyLargeBusinessDiscount } from './rewards-distribution.helpers';

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
        new Map([['Waste Generator', { externalEventsMap: {} }]]),
      )
      .build()
      .participantsAccreditationDocuments.get('Waste Generator')!;

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
            'Waste Generator',
            {
              externalEventsMap: {
                ['Onboarding Declaration']:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: 'Onboarding Declaration',
                    },
                    [['Business Size Declaration', 'Large Business']],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get('Waste Generator')!;

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
            'Waste Generator',
            {
              externalEventsMap: {
                ['Onboarding Declaration']:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: 'Onboarding Declaration',
                    },
                    [['Business Size Declaration', 'Small Business']],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get('Waste Generator')!;

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
            'Waste Generator',
            {
              externalEventsMap: {
                ['Onboarding Declaration']:
                  stubDocumentEventWithMetadataAttributes(
                    {
                      name: 'Onboarding Declaration',
                    },
                    [],
                  ),
              },
            },
          ],
        ]),
      )
      .build()
      .participantsAccreditationDocuments.get('Waste Generator')!;

    expect(shouldApplyLargeBusinessDiscount(document)).toBe(true);
  });
});
