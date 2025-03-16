import {
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeValue,
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENT } from './waste-origin-identification.processor';

const { PICK_UP, WASTE_GENERATOR } = DocumentEventName;
const { WASTE_ORIGIN } = NewDocumentEventAttributeName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;

export const wasteOriginIdentificationTestCases = [
  {
    events: new Map([[PICK_UP, undefined]]),
    resultComment: RESULT_COMMENT.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event is missing`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
        }),
      ],
      [WASTE_GENERATOR, undefined],
    ]),
    resultComment: RESULT_COMMENT.UNIDENTIFIED_WASTE_ORIGIN,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED}`,
  },
  {
    events: new Map([
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
        }),
      ],
      [
        WASTE_GENERATOR,
        stubDocumentEventWithMetadataAttributes({
          name: WASTE_GENERATOR,
        }),
      ],
    ]),
    resultComment: RESULT_COMMENT.WASTE_ORIGIN_CONFLICT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED} and ${WASTE_GENERATOR} event is defined`,
  },
  {
    events: new Map([
      [PICK_UP, stubBoldMassIdPickUpEvent()],
      [WASTE_GENERATOR, stubDocumentEvent({ name: WASTE_GENERATOR })],
    ]),
    resultComment: RESULT_COMMENT.WASTE_ORIGIN_IDENTIFIED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and ${WASTE_GENERATOR} event is defined`,
  },
  {
    events: new Map([
      [PICK_UP, stubBoldMassIdPickUpEvent()],
      [WASTE_GENERATOR, undefined],
    ]),
    resultComment: RESULT_COMMENT.MISSING_WASTE_GENERATOR_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and no ${WASTE_GENERATOR} event`,
  },
  {
    events: new Map([
      [`${WASTE_GENERATOR}-1`, stubDocumentEvent({ name: WASTE_GENERATOR })],
      [`${WASTE_GENERATOR}-2`, stubDocumentEvent({ name: WASTE_GENERATOR })],
      [PICK_UP, stubDocumentEvent({ name: PICK_UP })],
    ]),
    resultComment: RESULT_COMMENT.MULTIPLE_WASTE_GENERATOR_EVENTS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `MassID document with multiple ${WASTE_GENERATOR} events`,
  },
];
