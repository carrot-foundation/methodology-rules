import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import {
  NON_HAULER_REQUIRED_VEHICLE_TYPES,
  RESULT_COMMENT,
} from './hauler-identification.processor';

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = NewDocumentEventAttributeName;
const { TRUCK } = DocumentEventVehicleType;

export const haulerIdentificationTestCases = [
  {
    events: [
      stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
        [VEHICLE_TYPE, TRUCK],
      ]),
      stubDocumentEvent({
        label: HAULER,
        name: ACTOR,
      }),
    ],
    resultComment: RESULT_COMMENT.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is not ${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event exists.`,
  },
  {
    events: [
      stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
        [VEHICLE_TYPE, TRUCK],
      ]),
    ],
    resultComment: RESULT_COMMENT.NO_HAULER_ACTOR_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is not ${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event does not exist.`,
  },
  {
    events: [
      stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
        [VEHICLE_TYPE, DocumentEventVehicleType.CART],
      ]),
    ],
    resultComment: RESULT_COMMENT.NON_HAULER_REQUIRED_VEHICLE_TYPE,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is ${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event does not exist.`,
  },
];
