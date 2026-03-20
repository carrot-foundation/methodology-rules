import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './waste-origin-identification.constants';

const { ACTOR, PICK_UP } = DocumentEventName;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;
const { WASTE_GENERATOR } = MethodologyDocumentEventLabel;

interface WasteOriginIdentificationTestCase extends RuleTestCase {
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

export const wasteOriginIdentificationTestCases: WasteOriginIdentificationTestCase[] =
  [
    {
      events: {
        [PICK_UP]: undefined,
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
      resultStatus: 'FAILED',
      scenario: `The "${PICK_UP}" event is missing`,
    },
    {
      events: {
        [`${ACTOR}-${WASTE_GENERATOR}`]: undefined,
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [[WASTE_ORIGIN, UNIDENTIFIED]],
        }),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.passed.UNIDENTIFIED_WASTE_ORIGIN,
      resultStatus: 'PASSED',
      scenario: `The "${PICK_UP}" event has the metadata "${WASTE_ORIGIN}" with the value "${UNIDENTIFIED}"`,
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
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.WASTE_ORIGIN_CONFLICT,
      resultStatus: 'FAILED',
      scenario: `The "${PICK_UP}" event has the metadata "${WASTE_ORIGIN}" with the value "${UNIDENTIFIED}" and the "${WASTE_GENERATOR}" event is defined`,
    },
    {
      events: {
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          label: WASTE_GENERATOR,
          name: ACTOR,
        }),
        [PICK_UP]: stubBoldMassIDPickUpEvent({
          metadataAttributes: [],
        }),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.passed.WASTE_ORIGIN_IDENTIFIED,
      resultStatus: 'PASSED',
      scenario: `The "${PICK_UP}" event without "${WASTE_ORIGIN}" metadata and the "${WASTE_GENERATOR}" event is defined`,
    },
    {
      events: {
        [`${ACTOR}-${WASTE_GENERATOR}`]: undefined,
        [PICK_UP]: stubBoldMassIDPickUpEvent(),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MISSING_WASTE_GENERATOR_EVENT,
      resultStatus: 'FAILED',
      scenario: `The "${PICK_UP}" event without "${WASTE_ORIGIN}" metadata and no "${WASTE_GENERATOR}" event`,
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
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_WASTE_GENERATOR_EVENTS,
      resultStatus: 'FAILED',
      scenario: `The MassID document with multiple "${WASTE_GENERATOR}" events`,
    },
  ];
