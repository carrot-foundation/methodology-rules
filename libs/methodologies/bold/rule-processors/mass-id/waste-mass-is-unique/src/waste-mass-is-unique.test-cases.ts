import {
  BoldStubsBuilder,
  stubBoldMassIdPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventLabel,
  MethodologyDocumentStatus,
} from '@carrot-fndn/shared/types';

import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';
import { RESULT_COMMENTS } from './waste-mass-is-unique.processor';

const { CANCELLED, OPEN } = MethodologyDocumentStatus;
const { DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

export const wasteMassIsUniqueTestCases = [
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.NO_DUPLICATES_FOUND,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'the document is unique',
  },
  {
    newDuplicateDocuments: [{ status: CANCELLED }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.ONLY_CANCELLED_DUPLICATES(2, 2),
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'only cancelled duplicates are found',
  },
  {
    newDuplicateDocuments: [
      { status: OPEN },
      { status: OPEN },
      { status: CANCELLED },
    ],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'valid duplicates are found',
  },
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 2),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'valid duplicates are found in old format',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    oldDuplicateDocuments: [{ status: CANCELLED }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(3, 2),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'valid duplicates are found in both formats',
  },
];

const processorErrors = new WasteMassIsUniqueProcessorErrors();

const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .build();

export const wasteMassIsUniqueErrorTestCases = [
  {
    massIdAuditDocument,
    massIdDocument: undefined,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'when the MassID document is missing',
  },
  {
    massIdAuditDocument,
    massIdDocument: {
      ...massIdDocument,
      externalEvents: massIdDocument.externalEvents?.filter(
        (event) => event.name !== DROP_OFF.toString(),
      ),
    },
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_DROP_OFF_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `when the "${DROP_OFF}" event is missing`,
  },
  {
    massIdAuditDocument,
    massIdDocument: {
      ...massIdDocument,
      externalEvents: massIdDocument.externalEvents?.filter(
        (event) => event.name !== PICK_UP.toString(),
      ),
    },
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `when the "${PICK_UP}" event is missing`,
  },
  {
    massIdAuditDocument,
    massIdDocument: {
      ...massIdDocument,
      externalEvents: massIdDocument.externalEvents?.filter(
        (event) => event.label !== WASTE_GENERATOR.toString(),
      ),
    },
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_WASTE_GENERATOR_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `when the "${WASTE_GENERATOR}" event is missing`,
  },
  {
    massIdAuditDocument,
    massIdDocument: {
      ...massIdDocument,
      externalEvents: massIdDocument.externalEvents?.filter(
        (event) => event.label !== RECYCLER.toString(),
      ),
    },
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `when the "${RECYCLER}" event is missing`,
  },
  {
    massIdAuditDocument,
    massIdDocument: {
      ...massIdDocument,
      externalEvents: [
        ...(massIdDocument.externalEvents ?? []).filter(
          (event) => event.name !== PICK_UP.toString(),
        ),
        stubBoldMassIdPickUpEvent({
          metadataAttributes: [[VEHICLE_LICENSE_PLATE, undefined]],
        }),
      ],
    },
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `when the "${VEHICLE_LICENSE_PLATE}" attribute is missing`,
  },
];
