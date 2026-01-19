import {
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENT } from './waste-origin-identification.processor';

const { ACTOR, PICK_UP } = DocumentEventName;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;
const { WASTE_GENERATOR } = MethodologyDocumentEventLabel;

export const wasteOriginIdentificationTestCases = [
  {
    events: {
      [PICK_UP]: undefined,
    },
    resultComment: RESULT_COMMENT.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `${PICK_UP} event is missing`,
  },
  {
    events: {
      [`${ACTOR}-${WASTE_GENERATOR}`]: undefined,
      [PICK_UP]: stubBoldMassIDPickUpEvent({
        metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
      }),
    },
    resultComment: RESULT_COMMENT.UNIDENTIFIED_WASTE_ORIGIN,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED}`,
  },
  {
    events: {
      [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
        label: WASTE_GENERATOR,
        name: ACTOR,
      }),
      [PICK_UP]: stubBoldMassIDPickUpEvent({
        metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
      }),
    },
    resultComment: RESULT_COMMENT.WASTE_ORIGIN_CONFLICT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED} and ${WASTE_GENERATOR} event is defined`,
  },
  {
    events: {
      [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
        label: WASTE_GENERATOR,
        name: ACTOR,
      }),
      [PICK_UP]: stubBoldMassIDPickUpEvent(),
    },
    resultComment: RESULT_COMMENT.WASTE_ORIGIN_IDENTIFIED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and ${WASTE_GENERATOR} event is defined`,
  },
  {
    events: {
      [`${ACTOR}-${WASTE_GENERATOR}`]: undefined,
      [PICK_UP]: stubBoldMassIDPickUpEvent(),
    },
    resultComment: RESULT_COMMENT.MISSING_WASTE_GENERATOR_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and no ${WASTE_GENERATOR} event`,
  },
  {
    events: {
      [`${ACTOR}-${WASTE_GENERATOR}-1`]: stubDocumentEvent({
        label: WASTE_GENERATOR,
        name: ACTOR,
      }),
      [`${ACTOR}-${WASTE_GENERATOR}-2`]: stubDocumentEvent({
        label: WASTE_GENERATOR,
        name: ACTOR,
      }),
      [PICK_UP]: stubBoldMassIDPickUpEvent(),
    },
    resultComment: RESULT_COMMENT.MULTIPLE_WASTE_GENERATOR_EVENTS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `MassID document with multiple ${WASTE_GENERATOR} events`,
  },
];
