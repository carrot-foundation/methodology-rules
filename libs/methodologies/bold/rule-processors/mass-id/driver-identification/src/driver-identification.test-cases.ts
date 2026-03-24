import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubBoldMassIDPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './driver-identification.constants';

interface DriverIdentificationTestCase extends RuleTestCase {
  pickUpEvent: ReturnType<typeof stubBoldMassIDPickUpEvent>;
}

const someJustification =
  'The driver is exempt from identification requirements.';

export const driverIdentificationTestCases: DriverIdentificationTestCase[] = [
  {
    manifestExample: true,
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        ['Driver Identifier', '123.456.789-00'],
        ['Driver Identifier Exemption Justification', undefined],
        ['Vehicle Type', 'Truck'],
      ],
    }),
    resultComment: RESULT_COMMENTS.passed.DRIVER_IDENTIFIER,
    resultStatus: 'PASSED',
    scenario: 'The "Driver Identifier" is provided',
  },
  {
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        ['Driver Identifier', undefined],
        ['Driver Identifier Exemption Justification', someJustification],
        ['Vehicle Type', 'Bicycle'],
      ],
    }),
    resultComment:
      RESULT_COMMENTS.passed.JUSTIFICATION_PROVIDED(someJustification),
    resultStatus: 'PASSED',
    scenario: 'The "Driver Identifier" is not provided, but the "Driver Identifier Exemption Justification" is provided',
  },
  {
    manifestExample: true,
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        ['Driver Identifier', undefined],
        ['Driver Identifier Exemption Justification', undefined],
        ['Vehicle Type', 'Boat'],
      ],
    }),
    resultComment: RESULT_COMMENTS.failed.MISSING_JUSTIFICATION('Boat'),
    resultStatus: 'FAILED',
    scenario: 'The "Driver Identifier" is not provided and the "Driver Identifier Exemption Justification" is not provided',
  },
  {
    manifestExample: true,
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        ['Driver Identifier', undefined],
        ['Driver Identifier Exemption Justification', undefined],
        ['Vehicle Type', 'Sludge Pipes'],
      ],
    }),
    resultComment: RESULT_COMMENTS.passed.SLUDGE_PIPES,
    resultStatus: 'PASSED',
    scenario: 'The vehicle type is "Sludge Pipes"',
  },
  {
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        ['Driver Identifier', faker.string.uuid()],
        ['Driver Identifier Exemption Justification', someJustification],
        ['Vehicle Type', 'Truck'],
      ],
    }),
    resultComment: RESULT_COMMENTS.failed.DRIVER_AND_JUSTIFICATION_PROVIDED,
    resultStatus: 'FAILED',
    scenario: 'Both "Driver Identifier" and "Driver Identifier Exemption Justification" are provided',
  },
];
