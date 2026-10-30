import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantAccreditationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getRequiredAdditionalVerificationsFromAccreditationDocument } from './weighing.helpers';

const effectiveDates = {
  current: '2025-01-01T00:00:00.000Z',
  future: '2026-01-01T00:00:00.000Z',
  previous: '2024-01-01T00:00:00.000Z',
};

describe('weighing.helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { expectedVerification: 'Current verification', periods: ['current'] },
    {
      expectedVerification: 'Current verification',
      periods: ['previous', 'current'],
    },
    {
      expectedVerification: 'Current verification',
      periods: ['current', 'previous'],
    },
    {
      expectedVerification: 'Current verification',
      periods: ['future', 'current'],
    },
    { expectedVerification: undefined, periods: ['future'] },
  ] as const)(
    'should select required verifications for $periods at audit time',
    ({ expectedVerification, periods }) => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: periods.map((period) =>
          stubDocumentEventWithMetadataAttributes(
            { name: BoldDocumentEventName.ACCREDITATION_RESULT },
            [
              [BoldAttributeName.EFFECTIVE_DATE, effectiveDates[period]],
              [
                BoldAttributeName.REQUIRED_ADDITIONAL_VERIFICATIONS,
                [
                  {
                    'Verification Type':
                      period === 'current'
                        ? 'Current verification'
                        : 'Other verification',
                  },
                ],
              ],
            ],
          ),
        ),
      });

      const verifications =
        getRequiredAdditionalVerificationsFromAccreditationDocument(document);

      expect(verifications).toEqual(
        expectedVerification === undefined
          ? undefined
          : [{ 'Verification Type': expectedVerification }],
      );
    },
  );

  it('should return undefined when accreditation result event is missing', () => {
    const recyclerAccreditationDocument = stubParticipantAccreditationDocument({
      externalEvents: [],
    });

    const result = getRequiredAdditionalVerificationsFromAccreditationDocument(
      recyclerAccreditationDocument,
    );

    expect(result).toBeUndefined();
  });
});
