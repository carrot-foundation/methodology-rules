import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './hauler-identification.constants';
import { OPTIONAL_HAULER_VEHICLE_TYPES } from './hauler-identification.processor';

interface HaulerIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = DocumentEventAttributeName;
const { TRUCK } = DocumentEventVehicleType;

export const haulerIdentificationTestCases: HaulerIdentificationTestCase[] = [
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
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, TRUCK]],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.passed.HAULER_EVENT_FOUND,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `The "${VEHICLE_TYPE}" attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "${HAULER}" actor event exists`,
  },
  {
    events: new Map([
      [`${ACTOR}-${HAULER}`, undefined],
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, TRUCK]],
        }),
      ],
    ]),
    resultComment: RESULT_COMMENTS.failed.HAULER_EVENT_MISSING(TRUCK),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `The "${VEHICLE_TYPE}" attribute is set with a vehicle type that is not ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "${HAULER}" actor event does not exist`,
  },
  {
    events: new Map([
      [`${ACTOR}-${HAULER}`, undefined],
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          metadataAttributes: [[VEHICLE_TYPE, DocumentEventVehicleType.CART]],
        }),
      ],
    ]),
    manifestExample: true,
    resultComment: RESULT_COMMENTS.passed.HAULER_NOT_REQUIRED(
      DocumentEventVehicleType.CART,
    ),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `The "${VEHICLE_TYPE}" attribute is set with a vehicle type that is ${OPTIONAL_HAULER_VEHICLE_TYPES.join(
      ', ',
    )} and the "${HAULER}" actor event does not exist`,
  },
  {
    events: new Map([
      [
        `${ACTOR}-${HAULER}`,
        stubDocumentEvent({
          label: HAULER,
          name: ACTOR,
        }),
      ],
      [PICK_UP, undefined],
    ]),
    resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `The "${PICK_UP}" event is missing`,
  },
];
