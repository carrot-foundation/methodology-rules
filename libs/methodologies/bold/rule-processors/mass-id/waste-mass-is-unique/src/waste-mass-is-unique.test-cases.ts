import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  BoldStubsBuilder,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventLabel,
  MethodologyDocumentStatus,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './waste-mass-is-unique.constants';
import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';

const { CANCELLED, OPEN } = MethodologyDocumentStatus;
const { DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

interface WasteMassIsUniqueTestCase extends RuleTestCase {
  newDuplicateDocuments: Array<{ status: MethodologyDocumentStatus }>;
  oldDuplicateDocuments: Array<{ status: MethodologyDocumentStatus }>;
}

export const wasteMassIsUniqueTestCases: WasteMassIsUniqueTestCase[] = [
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.passed.NO_DUPLICATES_FOUND,
    resultStatus: 'PASSED' as const,
    scenario: 'The document is unique',
  },
  {
    newDuplicateDocuments: [{ status: CANCELLED }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.passed.ONLY_CANCELLED_DUPLICATES(2, 2),
    resultStatus: 'PASSED' as const,
    scenario: 'Only cancelled duplicates were found',
  },
  {
    newDuplicateDocuments: [
      { status: OPEN },
      { status: OPEN },
      { status: CANCELLED },
    ],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: 'FAILED' as const,
    scenario: 'Valid duplicates were found',
  },
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(2, 2),
    resultStatus: 'FAILED' as const,
    scenario: 'Valid duplicates were found in old format',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    oldDuplicateDocuments: [{ status: CANCELLED }],
    resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: 'FAILED' as const,
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
      resultStatus: 'FAILED' as const,
      scenario: 'The MassID document is missing',
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== DROP_OFF.toString(),
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_DROP_OFF_EVENT,
      resultStatus: 'FAILED' as const,
      scenario: `The "${DROP_OFF}" event is missing`,
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.name !== PICK_UP.toString(),
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_PICK_UP_EVENT,
      resultStatus: 'FAILED' as const,
      scenario: `The "${PICK_UP}" event is missing`,
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.label !== WASTE_GENERATOR.toString(),
        ),
      },
      resultComment:
        processorErrors.ERROR_MESSAGE.MISSING_WASTE_GENERATOR_EVENT,
      resultStatus: 'FAILED' as const,
      scenario: `The "${WASTE_GENERATOR}" event is missing`,
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: massIDDocument.externalEvents?.filter(
          (event) => event.label !== RECYCLER.toString(),
        ),
      },
      resultComment: processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_EVENT,
      resultStatus: 'FAILED' as const,
      scenario: `The "${RECYCLER}" event is missing`,
    },
    {
      massIDAuditDocument,
      massIDDocument: {
        ...massIDDocument,
        externalEvents: [
          ...(massIDDocument.externalEvents ?? []).filter(
            (event) => event.name !== PICK_UP.toString(),
          ),
          stubBoldMassIDPickUpEvent({
            metadataAttributes: [[VEHICLE_LICENSE_PLATE, undefined]],
          }),
        ],
      },
      resultComment:
        processorErrors.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
      resultStatus: 'FAILED' as const,
      scenario: `The "${VEHICLE_LICENSE_PLATE}" attribute is missing`,
    },
  ];
