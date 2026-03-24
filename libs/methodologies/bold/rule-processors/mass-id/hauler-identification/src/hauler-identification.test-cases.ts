import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventVehicleType } from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './hauler-identification.constants';
import { OPTIONAL_HAULER_VEHICLE_TYPES } from './hauler-identification.processor';

interface HaulerIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

export const haulerIdentificationTestCases: HaulerIdentificationTestCase[] = [
  {
    events: new Map([
      [
        'ACTOR-Hauler',
        stubDocumentEvent({
          label: 'Hauler',
          name: 'ACTOR',
        }),
      ],
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', 'Truck']],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.passed.HAULER_EVENT_FOUND,
    resultStatus: 'PASSED',
    scenario: `The "Vehicle Type" attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "Hauler" actor event exists`,
  },
  {
    events: new Map([
      ['ACTOR-Hauler', undefined],
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', 'Truck']],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.HAULER_EVENT_MISSING('Truck'),
    resultStatus: 'FAILED',
    scenario: `The "Vehicle Type" attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "Hauler" actor event does not exist`,
  },
  {
    events: new Map([
      ['ACTOR-Hauler', undefined],
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', DocumentEventVehicleType.Cart]],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.passed.HAULER_NOT_REQUIRED(
      DocumentEventVehicleType.Cart,
    ),
    resultStatus: 'PASSED',
    scenario: `The "Vehicle Type" attribute is set with a vehicle type that is ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "Hauler" actor event does not exist`,
  },
  {
    events: new Map([
      [
        'ACTOR-Hauler',
        stubDocumentEvent({
          label: 'Hauler',
          name: 'ACTOR',
        }),
      ],
      ['Pick-up', undefined],
    ]),
    resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
    resultStatus: 'FAILED',
    scenario: 'The "Pick-up" event is missing',
  },
];
