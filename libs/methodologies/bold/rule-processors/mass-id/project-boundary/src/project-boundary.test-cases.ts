import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  type BoldExternalEventsObject,
  generateNearbyCoordinates,
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import { convertDistance } from 'geolib';

import { RESULT_COMMENTS } from './project-boundary.constants';

const { DROP_OFF, PICK_UP } = BoldDocumentEventName;

const distance = faker.number.float({ max: 5000, min: 100 });

const coordinates = generateNearbyCoordinates({
  distance,
});

const actualDistance = calculateDistance(coordinates.base, coordinates.nearby);
const distanceInKm =
  Math.round(convertDistance(actualDistance, 'km') * 1000) / 1000;

interface ProjectBoundaryTestCase extends RuleTestCase {
  events: BoldExternalEventsObject;
  resultContent?: { distance: number };
}

export const projectBoundaryTestCases: ProjectBoundaryTestCase[] = [
  {
    events: {
      [DROP_OFF]: undefined,
    },
    resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
    resultStatus: 'FAILED',
    scenario: `The MassID document has no "${DROP_OFF}" event`,
  },
  {
    events: {
      [PICK_UP]: undefined,
    },
    resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
    resultStatus: 'FAILED',
    scenario: `The MassID document has no "${PICK_UP}" event`,
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent({
        partialDocumentEvent: {
          address: {
            ...stubAddress(),
            ...coordinates.nearby,
          },
        },
      }),
      [PICK_UP]: stubBoldMassIDPickUpEvent({
        partialDocumentEvent: {
          address: {
            ...stubAddress(),
            ...coordinates.base,
          },
        },
      }),
    },
    manifestFields: { addressFields: ['latitude', 'longitude'] },
    resultComment: RESULT_COMMENTS.passed.SUCCESS(distanceInKm),
    resultContent: {
      distance: distanceInKm,
    },
    resultStatus: 'PASSED',
    scenario: `The MassID document has multiple "${DROP_OFF}" events and all criteria are met`,
  },
];
