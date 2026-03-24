import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './waste-origin-identification.constants';

interface WasteOriginIdentificationTestCase extends RuleTestCase {
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

export const wasteOriginIdentificationTestCases: WasteOriginIdentificationTestCase[] =
  [
    {
      events: {
        'Pick-up': undefined,
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
      resultStatus: 'FAILED',
      scenario: 'The "Pick-up" event is missing',
    },
    {
      events: {
        'ACTOR-Waste Generator': undefined,
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Waste Origin', 'Unidentified']],
        }),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.passed.UNIDENTIFIED_WASTE_ORIGIN,
      resultStatus: 'PASSED',
      scenario:
        'The "Pick-up" event has the metadata "Waste Origin" with the value "Unidentified"',
    },
    {
      events: {
        'ACTOR-Waste Generator': stubDocumentEvent({
          label: 'Waste Generator',
          name: 'ACTOR',
        }),
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [['Waste Origin', 'Unidentified']],
        }),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.WASTE_ORIGIN_CONFLICT,
      resultStatus: 'FAILED',
      scenario:
        'The "Pick-up" event has the metadata "Waste Origin" with the value "Unidentified" and the "Waste Generator" event is defined',
    },
    {
      events: {
        'ACTOR-Waste Generator': stubDocumentEvent({
          label: 'Waste Generator',
          name: 'ACTOR',
        }),
        'Pick-up': stubBoldMassIDPickUpEvent({
          metadataAttributes: [],
        }),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.passed.WASTE_ORIGIN_IDENTIFIED,
      resultStatus: 'PASSED',
      scenario:
        'The "Pick-up" event without "Waste Origin" metadata and the "Waste Generator" event is defined',
    },
    {
      events: {
        'ACTOR-Waste Generator': undefined,
        'Pick-up': stubBoldMassIDPickUpEvent(),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MISSING_WASTE_GENERATOR_EVENT,
      resultStatus: 'FAILED',
      scenario:
        'The "Pick-up" event without "Waste Origin" metadata and no "Waste Generator" event',
    },
    {
      events: {
        'ACTOR-Waste Generator-1': stubDocumentEvent({
          label: 'Waste Generator',
          name: 'ACTOR',
        }),
        'ACTOR-Waste Generator-2': stubDocumentEvent({
          label: 'Waste Generator',
          name: 'ACTOR',
        }),
        'Pick-up': stubBoldMassIDPickUpEvent(),
      },
      manifestExample: true,
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_WASTE_GENERATOR_EVENTS,
      resultStatus: 'FAILED',
      scenario: 'The MassID document with multiple "Waste Generator" events',
    },
  ];
