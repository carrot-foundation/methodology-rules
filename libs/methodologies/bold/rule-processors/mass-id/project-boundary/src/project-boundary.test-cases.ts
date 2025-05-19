import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  generateNearbyCoordinates,
  stubAddress,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { convertDistance } from 'geolib';

import { RESULT_COMMENTS } from './project-boundary.processor';

const { DROP_OFF, PICK_UP } = DocumentEventName;

const distance = faker.number.float({ max: 5000, min: 100 });

const coordinates = generateNearbyCoordinates({
  distance,
});

const actualDistance = calculateDistance(coordinates.base, coordinates.nearby);
const distanceInKm =
  Math.round(convertDistance(actualDistance, 'km') * 1000) / 1000;

export const projectBoundaryTestCases = [
  {
    events: {
      [DROP_OFF]: undefined,
    },
    resultComment: RESULT_COMMENTS.MISSING_DROP_OFF_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'missing drop off event',
  },
  {
    events: {
      [PICK_UP]: undefined,
    },
    resultComment: RESULT_COMMENTS.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'missing pick up event',
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIdDropOffEvent({
        partialDocumentEvent: {
          address: {
            ...stubAddress(),
            ...coordinates.nearby,
          },
        },
      }),
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        partialDocumentEvent: {
          address: {
            ...stubAddress(),
            ...coordinates.base,
          },
        },
      }),
    },
    resultComment: RESULT_COMMENTS.SUCCESS(distanceInKm),
    resultContent: {
      distance: distanceInKm,
    },
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'there are more than one drop off event and all criteria are met',
  },
];
