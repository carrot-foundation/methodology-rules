import {
  stubDocumentEventWithMetadataAttributes,
  stubMassDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import {
  RESULT_COMMENTS,
  VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES,
} from './vehicle-identification.processor';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  NewDocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;
const { OTHERS, TRUCK } = DocumentEventVehicleType;

export const vehicleIdentificationTestCases = [
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, 'INVALID_VEHICLE_TYPE'],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.VEHICLE_TYPE_MISMATCH(
      'INVALID_VEHICLE_TYPE',
    ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not a valid vehicle type`,
  },
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, []),
      ],
    }),
    resultComment: RESULT_COMMENTS.MISSING_VEHICLE_TYPE_DECLARATION,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not present`,
  },
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, OTHERS],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.MISSING_VEHICLE_DESCRIPTION,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} but the "${VEHICLE_DESCRIPTION}" attribute is not present`,
  },
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, OTHERS],
          [VEHICLE_DESCRIPTION, 'VEHICLE_DESCRIPTION'],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.APPROVED(OTHERS),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${OTHERS} and the "${VEHICLE_DESCRIPTION}" attribute is present`,
  },
  {
    document: stubMassDocument({
      externalEvents: [],
    }),
    resultComment: RESULT_COMMENTS.PICK_UP_EVENT_MISSING,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${PICK_UP}" event is not present`,
  },
  ...VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.map((vehicleType) => ({
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, vehicleType],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.APPROVED(vehicleType),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the "${VEHICLE_TYPE}" attribute is declared as ${vehicleType} and no license plate is needed`,
  })),
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, TRUCK],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.MISSING_VEHICLE_LICENSE_PLATE(TRUCK),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement but no license plate is provided`,
  },
  {
    document: stubMassDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
          [VEHICLE_TYPE, TRUCK],
          [VEHICLE_LICENSE_PLATE, faker.vehicle.vrm()],
        ]),
      ],
    }),
    resultComment: RESULT_COMMENTS.APPROVED(TRUCK),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the "${VEHICLE_TYPE}" attribute is not exempt from license plate requirement and license plate is provided`,
  },
];
