import { stubBoldMassIdPickUpEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './driver-identification.processor';

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = NewDocumentEventAttributeName;
const { BICYCLE, BOAT, SLUDGE_PIPES, TRUCK } = DocumentEventVehicleType;

const someJustification = faker.lorem.sentence();

export const driverIdentificationTestCases = [
  {
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, faker.lorem.sentence()],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, TRUCK],
      ],
    }),
    resultComment: RESULT_COMMENTS.DRIVER_IDENTIFIER,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${DRIVER_IDENTIFIER} is provided`,
  },
  {
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, someJustification],
        [VEHICLE_TYPE, BICYCLE],
      ],
    }),
    resultComment: RESULT_COMMENTS.JUSTIFICATION_PROVIDED(someJustification),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${DRIVER_IDENTIFIER} is not provided, but the ${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION} is provided`,
  },
  {
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, BOAT],
      ],
    }),
    resultComment: RESULT_COMMENTS.MISSING_JUSTIFICATION(BOAT),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${DRIVER_IDENTIFIER} is not provided and the ${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION} is not provided`,
  },
  {
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, undefined],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, undefined],
        [VEHICLE_TYPE, SLUDGE_PIPES],
      ],
    }),
    resultComment: RESULT_COMMENTS.SLUDGE_PIPES,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the vehicle type is ${SLUDGE_PIPES}`,
  },
  {
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        [DRIVER_IDENTIFIER, faker.lorem.sentence()],
        [DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION, someJustification],
        [VEHICLE_TYPE, TRUCK],
      ],
    }),
    resultComment: RESULT_COMMENTS.DRIVER_AND_JUSTIFICATION_PROVIDED,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `both ${DRIVER_IDENTIFIER} and ${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION} are provided`,
  },
];
