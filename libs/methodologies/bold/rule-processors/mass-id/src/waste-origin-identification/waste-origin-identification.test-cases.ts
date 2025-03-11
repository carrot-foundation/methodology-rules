import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENT } from './waste-origin-identification.processor';

const { PICK_UP, WASTE_GENERATOR } = DocumentEventName;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;

export const wasteOriginIdentificationTestCases = [
  {
    pickUpEvent: undefined,
    resultComment: RESULT_COMMENT.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event is missing`,
    wasteGeneratorEvent: undefined,
  },
  {
    pickUpEvent: stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
      [WASTE_ORIGIN, UNIDENTIFIED],
    ]),
    resultComment: RESULT_COMMENT.UNIDENTIFIED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED}`,
    wasteGeneratorEvent: undefined,
  },
  {
    pickUpEvent: stubDocumentEventWithMetadataAttributes({ name: PICK_UP }, [
      [WASTE_ORIGIN, UNIDENTIFIED],
    ]),
    resultComment: RESULT_COMMENT.UNIDENTIFIED_WITH_WASTE_GENERATOR,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event has the metadata ${WASTE_ORIGIN} with the value ${UNIDENTIFIED} and ${WASTE_GENERATOR} event is defined`,
    wasteGeneratorEvent: stubDocumentEvent({ name: WASTE_GENERATOR }),
  },
  {
    pickUpEvent: stubDocumentEvent({ name: PICK_UP }),
    resultComment: RESULT_COMMENT.IDENTIFIED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and ${WASTE_GENERATOR} event is defined`,
    wasteGeneratorEvent: stubDocumentEvent({ name: WASTE_GENERATOR }),
  },
  {
    pickUpEvent: stubDocumentEvent({ name: PICK_UP }),
    resultComment: RESULT_COMMENT.UNIDENTIFIED_WITHOUT_WASTE_GENERATOR,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `${PICK_UP} event without ${WASTE_ORIGIN} metadata and no ${WASTE_GENERATOR} event`,
    wasteGeneratorEvent: undefined,
  },
];
