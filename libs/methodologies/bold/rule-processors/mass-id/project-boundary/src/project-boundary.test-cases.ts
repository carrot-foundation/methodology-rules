import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  type BoldExternalEventsObject,
  generateNearbyCoordinates,
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { convertDistance } from 'geolib';

import { RESULT_COMMENTS } from './project-boundary.constants';

const { DROP_OFF, PICK_UP } = DocumentEventName;

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
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'missing drop off event',
  },
  {
    events: {
      [PICK_UP]: undefined,
    },
    resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'missing pick up event',
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
    resultComment: RESULT_COMMENTS.passed.SUCCESS(distanceInKm),
    resultContent: {
      distance: distanceInKm,
    },
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'there are more than one drop off event and all criteria are met',
  },
];
