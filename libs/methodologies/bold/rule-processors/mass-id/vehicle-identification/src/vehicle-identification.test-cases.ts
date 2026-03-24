import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { LicensePlate } from '@carrot-fndn/shared/types';

import { stubBoldMassIDPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './vehicle-identification.constants';
import { VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES } from './vehicle-identification.processor';

interface VehicleIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubBoldMassIDPickUpEvent> | undefined>;
}

export const vehicleIdentificationTestCases: VehicleIdentificationTestCase[] = [
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', 'INVALID_VEHICLE_TYPE']],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.INVALID_VEHICLE_TYPE(
      'INVALID_VEHICLE_TYPE',
    ),
    resultStatus: 'FAILED',
    scenario: 'The "Vehicle Type" attribute is not a valid vehicle type',
  },
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', undefined]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.VEHICLE_TYPE_MISSING,
    resultStatus: 'FAILED',
    scenario: 'The "Vehicle Type" attribute is not present',
  },
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Vehicle Type', 'Others'],
            ['Vehicle Description', undefined],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.VEHICLE_DESCRIPTION_MISSING('Others'),
    resultStatus: 'FAILED',
    scenario:
      'The "Vehicle Type" attribute is declared as Others but the "Vehicle Description" attribute is not present',
  },
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Vehicle Type', 'Others'],
            ['Vehicle Description', 'Blue flatbed truck - 8 ton capacity'],
          ],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment:
      RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_DESCRIPTION('Others'),
    resultStatus: 'PASSED',
    scenario:
      'The "Vehicle Type" attribute is declared as Others and the "Vehicle Description" attribute is present',
  },
  {
    events: new Map([['Pick-up', undefined]]),
    resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
    resultStatus: 'FAILED',
    scenario: 'The "Pick-up" event is not present',
  },
  ...[...VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES].map((vehicleType) => ({
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Vehicle Type', vehicleType]],
        }),
      ],
    ]),
    resultComment:
      RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE(
        vehicleType,
      ),
    resultStatus: 'PASSED',
    scenario: `The "Vehicle Type" attribute is declared as ${vehicleType} and no license plate is needed`,
  })),
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Vehicle Type', 'Truck'],
            ['Vehicle License Plate', undefined],
          ],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.LICENSE_PLATE_MISSING('Truck'),
    resultStatus: 'FAILED',
    scenario:
      'The "Vehicle Type" attribute is not exempt from license plate requirement but no license plate is provided',
  },
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Vehicle Type', 'Truck'],
            ['Vehicle License Plate', 'ABC1D23' as LicensePlate],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    resultStatus: 'PASSED',
    scenario:
      'The "Vehicle Type" attribute is not exempt from license plate requirement and license plate is provided',
  },
  {
    events: new Map([
      [
        'Pick-up',
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            ['Vehicle Type', 'Truck'],
            ['Vehicle License Plate', 'INVALID_LICENSE_PLATE'],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.INVALID_LICENSE_PLATE_FORMAT,
    resultStatus: 'FAILED',
    scenario:
      'The "Vehicle License Plate" attribute is not a valid license plate',
  },
];
