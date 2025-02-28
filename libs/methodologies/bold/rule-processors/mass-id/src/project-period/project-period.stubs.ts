import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { addDays, addHours, subDays, subSeconds } from 'date-fns';

const { RECYCLED } = DocumentEventName;

/**
 * Creates a BRT timezone date string from a Date object
 * BRT is UTC-3, so we add 3 hours to convert from UTC to BRT
 */
export const createBRTDateString = (date: Date): string => {
  const utcDate = new Date(date);
  const brtAsUtc = addHours(utcDate, 3);

  return brtAsUtc.toISOString();
};

/**
 * Creates test data for project period tests
 */
export const createProjectPeriodTestData = (options?: {
  eligibleDate?: Date;
}) => {
  const eligibleDate = options?.eligibleDate ?? new Date();

  // Create document with recycled event after eligible date
  const documentWithAfterEligibleDateEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: addDays(eligibleDate, 1).toISOString(),
        name: RECYCLED,
      }),
    ],
  });

  // Create document with recycled event before eligible date
  const documentWithBeforeEligibleDateEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: subDays(eligibleDate, 1).toISOString(),
        name: RECYCLED,
      }),
    ],
  });

  // Create document with recycled event exactly at eligible date
  const documentWithExactEligibleDateEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: eligibleDate.toISOString(),
        name: RECYCLED,
      }),
    ],
  });

  // Create document with recycled event 1 second before eligible date in UTC but after in BRT
  const documentWithBRTEligibleDateEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: createBRTDateString(subSeconds(eligibleDate, 1)),
        name: RECYCLED,
      }),
    ],
  });

  // Create document with recycled event exactly at eligible date in BRT
  const documentWithExactBRTEligibleDateEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: createBRTDateString(eligibleDate),
        name: RECYCLED,
      }),
    ],
  });

  // Create document with recycled event missing externalCreatedAt
  const documentWithMissingExternalCreatedAtEvent = stubDocument({
    externalEvents: [
      stubDocumentEvent({
        externalCreatedAt: undefined,
        name: RECYCLED,
      }),
    ],
  });

  // Create document with no recycled event
  const documentWithNoRecycledEvent = stubDocument({
    externalEvents: [],
  });

  return {
    documentWithAfterEligibleDateEvent,
    documentWithBRTEligibleDateEvent,
    documentWithBeforeEligibleDateEvent,
    documentWithExactBRTEligibleDateEvent,
    documentWithExactEligibleDateEvent,
    documentWithMissingExternalCreatedAtEvent,
    documentWithNoRecycledEvent,
    eligibleDate,
  };
};
