import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubBoldMassIDPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './driver-identification.constants';

interface DriverIdentificationTestCase extends RuleTestCase {
  pickUpEvent: ReturnType<typeof stubBoldMassIDPickUpEvent>;
}

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = DocumentEventAttributeName;
const { BICYCLE, BOAT, SLUDGE_PIPES, TRUCK } = DocumentEventVehicleType;

const someJustification =
  'The driver is exempt from identification requirements.';

export const driverIdentificationTestCases: DriverIdentificationTestCase[] = [
  {
    manifestExample: true,
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, faker.string.uuid()],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, TRUCK],
      ],
    }),
    resultComment: RESULT_COMMENTS.passed.DRIVER_IDENTIFIER,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `The "${DRIVER_IDENTIFIER}" is provided`,
  },
  {
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, someJustification],
        [VEHICLE_TYPE, BICYCLE],
      ],
    }),
    resultComment:
      RESULT_COMMENTS.passed.JUSTIFICATION_PROVIDED(someJustification),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `The "${DRIVER_IDENTIFIER}" is not provided, but the "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" is provided`,
  },
  {
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, BOAT],
      ],
    }),
    resultComment: RESULT_COMMENTS.failed.MISSING_JUSTIFICATION(BOAT),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `The "${DRIVER_IDENTIFIER}" is not provided and the "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" is not provided`,
  },
  {
    manifestExample: true,
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, SLUDGE_PIPES],
      ],
    }),
    resultComment: RESULT_COMMENTS.passed.SLUDGE_PIPES,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `The vehicle type is "${SLUDGE_PIPES}"`,
  },
  {
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, faker.string.uuid()],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, someJustification],
        [VEHICLE_TYPE, TRUCK],
      ],
    }),
    resultComment: RESULT_COMMENTS.failed.DRIVER_AND_JUSTIFICATION_PROVIDED,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `Both "${DRIVER_IDENTIFIER}" and "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" are provided`,
  },
];
