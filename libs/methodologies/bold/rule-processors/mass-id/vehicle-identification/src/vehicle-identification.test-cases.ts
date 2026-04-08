import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';
import type { LicensePlate } from '@carrot-fndn/shared/types';

import { stubBoldMassIDPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
  BoldVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './vehicle-identification.constants';
import { VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES } from './vehicle-identification.processor';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  BoldAttributeName;
const { PICK_UP } = BoldDocumentEventName;
const { OTHERS, TRUCK } = BoldVehicleType;

interface VehicleIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubBoldMassIDPickUpEvent> | undefined>;
}

export const vehicleIdentificationTestCases: VehicleIdentificationTestCase[] = [
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, 'INVALID_VEHICLE_TYPE']],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.INVALID_VEHICLE_TYPE(
      'INVALID_VEHICLE_TYPE',
    ),
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_TYPE}" attribute is not a valid vehicle type`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, undefined]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.VEHICLE_TYPE_MISSING,
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_TYPE}" attribute is not present`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, OTHERS],
            [VEHICLE_DESCRIPTION, undefined],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.VEHICLE_DESCRIPTION_MISSING(OTHERS),
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} but the "${VEHICLE_DESCRIPTION}" attribute is not present`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, OTHERS],
            [VEHICLE_DESCRIPTION, 'Blue flatbed truck - 8 ton capacity'],
          ],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment:
      RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_DESCRIPTION(OTHERS),
    resultStatus: 'PASSED',
    scenario: `The "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} and the "${VEHICLE_DESCRIPTION}" attribute is present`,
  },
  {
    events: new Map([[PICK_UP, undefined]]),
    resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
    resultStatus: 'FAILED',
    scenario: `The "${PICK_UP}" event is not present`,
  },
  ...[...VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES].map(
    (vehicleType): VehicleIdentificationTestCase => ({
      events: new Map([
        [
          PICK_UP,
          stubBoldMassIDPickUpEvent({
            metadataAttributes: [[VEHICLE_TYPE, vehicleType]],
          }),
        ],
      ]),
      resultComment:
        RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE(
          vehicleType,
        ),
      resultStatus: 'PASSED',
      scenario: `The "${VEHICLE_TYPE}" attribute is declared as ${vehicleType} and no license plate is needed`,
    }),
  ),
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, TRUCK],
            [VEHICLE_LICENSE_PLATE, undefined],
          ],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.LICENSE_PLATE_MISSING(TRUCK),
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement but no license plate is provided`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, TRUCK],
            [VEHICLE_LICENSE_PLATE, 'ABC1D23' as LicensePlate],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    resultStatus: 'PASSED',
    scenario: `The "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement and license plate is provided`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, TRUCK],
            [VEHICLE_LICENSE_PLATE, 'INVALID_LICENSE_PLATE'],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.INVALID_LICENSE_PLATE_FORMAT,
    resultStatus: 'FAILED',
    scenario: `The "${VEHICLE_LICENSE_PLATE}" attribute is not a valid license plate`,
  },
];
