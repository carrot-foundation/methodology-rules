import {
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import {
  OPTIONAL_HAULER_VEHICLE_TYPES,
  RESULT_COMMENTS,
} from './hauler-identification.processor';

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = NewDocumentEventAttributeName;
const { TRUCK } = DocumentEventVehicleType;

export const haulerIdentificationTestCases = [
  {
    events: new Map([
      [
        `${ACTOR}-${HAULER}`,
        stubDocumentEvent({
          label: HAULER,
          name: ACTOR,
        }),
      ],
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, TRUCK]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.HAULER_EVENT_FOUND,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event exists.`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, TRUCK]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.HAULER_EVENT_MISSING(TRUCK),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event does not exist.`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, DocumentEventVehicleType.CART]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.HAULER_NOT_REQUIRED(
      DocumentEventVehicleType.CART,
    ),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the ${VEHICLE_TYPE} attribute is set with a vehicle type that is ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the ${HAULER} actor event does not exist.`,
  },
  {
    events: new Map([[PICK_UP, undefined]]),
    resultComment: RESULT_COMMENTS.PICK_UP_EVENT_MISSING,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `no ${PICK_UP} event exists.`,
  },
];
