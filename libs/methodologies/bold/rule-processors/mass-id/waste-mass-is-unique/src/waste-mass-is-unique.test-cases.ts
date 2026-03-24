import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { type MethodologyDocumentStatus } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './waste-mass-is-unique.constants';
import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';

interface WasteMassIsUniqueTestCase extends RuleTestCase {
  newDuplicateDocuments: Array<{ status: MethodologyDocumentStatus }>;
  oldDuplicateDocuments: Array<{ status: MethodologyDocumentStatus }>;
}

export const wasteMassIsUniqueTestCases: WasteMassIsUniqueTestCase[] = [
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.passed.NO_DUPLICATES_FOUND,
    resultStatus: 'PASSED',
    scenario: 'The document is unique',
  },
  {
    newDuplicateDocuments: [{ status: 'CANCELLED' }, { status: 'CANCELLED' }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.passed.ONLY_CANCELLED_DUPLICATES(2, 2),
    resultStatus: 'PASSED',
    scenario: 'Only cancelled duplicates were found',
  },
  {
    newDuplicateDocuments: [
      { status: 'OPEN' },
      { status: 'OPEN' },
      { status: 'CANCELLED' },
    ],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: 'FAILED',
    scenario: 'Valid duplicates were found',
  },
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [{ status: 'OPEN' }, { status: 'OPEN' }],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(2, 2),
    resultStatus: 'FAILED',
    scenario: 'Valid duplicates were found in old format',
  },
  {
    newDuplicateDocuments: [{ status: 'OPEN' }, { status: 'OPEN' }],
    oldDuplicateDocuments: [{ status: 'CANCELLED' }],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: 'FAILED',
    scenario: 'Valid duplicates were found in both formats',
  },
];

const processorErrors = new WasteMassIsUniqueProcessorErrors();

const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .build();

interface WasteMassIsUniqueErrorTestCase extends RuleTestCase {
  massIDAuditDocument: Document;
  massIDDocument: Document | undefined;
}

export const wasteMassIsUniqueErrorTestCases: WasteMassIsUniqueErrorTestCase[] =
  [
    {
      massIDAuditDocument,
      massIDDocument: undefined,
      resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID document is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== 'Drop-off',
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_DROP_OFF_EVENT,
      resultStatus: 'FAILED',
      scenario: 'The "Drop-off" event is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== 'Pick-up',
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_PICK_UP_EVENT,
      resultStatus: 'FAILED',
      scenario: 'The "Pick-up" event is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.label !== 'Waste Generator',
        ),
      },
      resultComment:
        processorErrors.ERROR_MESSAGE.MISSING_WASTE_GENERATOR_EVENT,
      resultStatus: 'FAILED',
      scenario: 'The "Waste Generator" event is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.label !== 'Recycler',
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_EVENT,
      resultStatus: 'FAILED',
      scenario: 'The "Recycler" event is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: [
          ...(massIDDocument.externalEvents ?? []).filter(
            (event) => event.name !== 'Pick-up',
          ),
          stubBoldMassIDPickUpEvent({
            metadataAttributes: [['Vehicle License Plate', undefined]],
          }),
        ],
      },
      resultComment:
        processorErrors.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
      resultStatus: 'FAILED',
      scenario: 'The "Vehicle License Plate" attribute is missing',
    },
  ];
