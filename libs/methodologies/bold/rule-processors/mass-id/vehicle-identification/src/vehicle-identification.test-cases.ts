import type { LicensePlate } from '@carrot-fndn/shared/types';

import { stubBoldMassIDPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import {
  RESULT_COMMENTS,
  VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES,
} from './vehicle-identification.processor';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  DocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;
const { OTHERS, TRUCK } = DocumentEventVehicleType;

export const vehicleIdentificationTestCases = [
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, 'INVALID_VEHICLE_TYPE']],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.INVALID_VEHICLE_TYPE('INVALID_VEHICLE_TYPE'),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not a valid vehicle type`,
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
    resultComment: RESULT_COMMENTS.VEHICLE_TYPE_MISSING,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not present`,
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
    resultComment: RESULT_COMMENTS.VEHICLE_DESCRIPTION_MISSING(OTHERS),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} but the "${VEHICLE_DESCRIPTION}" attribute is not present`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, OTHERS],
            [VEHICLE_DESCRIPTION, 'VEHICLE_DESCRIPTION'],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_DESCRIPTION(OTHERS),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} and the "${VEHICLE_DESCRIPTION}" attribute is present`,
  },
  {
    events: new Map([[PICK_UP, undefined]]),
    resultComment: RESULT_COMMENTS.PICK_UP_EVENT_MISSING,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${PICK_UP}" event is not present`,
  },
  ...[...VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES].map((vehicleType) => ({
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, vehicleType]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${vehicleType} and no license plate is needed`,
  })),
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
    resultComment: RESULT_COMMENTS.LICENSE_PLATE_MISSING(TRUCK),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement but no license plate is provided`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [
            [VEHICLE_TYPE, TRUCK],
            [VEHICLE_LICENSE_PLATE, random<LicensePlate>()],
          ],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement and license plate is provided`,
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
    resultComment: RESULT_COMMENTS.INVALID_LICENSE_PLATE_FORMAT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the "${VEHICLE_LICENSE_PLATE}" attribute is not a valid license plate`,
  },
];
