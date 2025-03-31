import {
  BoldStubsBuilder,
  stubBoldMassIdPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentStatus,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { UniquenessCheckProcessorErrors } from './uniqueness-check.errors';
import { RESULT_COMMENTS } from './uniqueness-check.processor';

const { CANCELLED, OPEN } = DocumentStatus;
const { DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { VEHICLE_LICENSE_PLATE: VEHICLE_LICENSE_PLATE_V1 } =
  DocumentEventAttributeName;
const { VEHICLE_LICENSE_PLATE: VEHICLE_LICENSE_PLATE_V2 } =
  NewDocumentEventAttributeName;

export const uniquenessCheckTestCases = [
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.NO_DUPLICATES_FOUND,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'the document is unique',
  },
  {
    newDuplicateDocuments: [{ status: CANCELLED }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.ONLY_CANCELLED_DUPLICATES(2, 2),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'only cancelled duplicates are found',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 1),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found',
  },
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 2),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found in old format',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }],
    oldDuplicateDocuments: [{ status: CANCELLED }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 1),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found in both formats',
  },
];

const processorErrors = new UniquenessCheckProcessorErrors();

const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
  .createMassIdDocument({
    externalEventsMap: {
      [PICK_UP]: stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [VEHICLE_LICENSE_PLATE_V1, faker.vehicle.vrm()],
          [VEHICLE_LICENSE_PLATE_V2, faker.vehicle.vrm()],
        ],
      }),
    },
  })
  .createMassIdAuditDocument()
  .build();

export const uniquenessCheckErrorTestCases = [
  {
    documents: [],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MASS_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'when the MassID document is missing',
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.name !== DROP_OFF.toString(),
        ),
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_DROP_OFF_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the "${DROP_OFF}" event is missing`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.name !== PICK_UP.toString(),
        ),
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_PICK_UP_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the "${PICK_UP}" event is missing`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.label !== WASTE_GENERATOR.toString(),
        ),
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_WASTE_GENERATOR_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the "${WASTE_GENERATOR}" event is missing`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: massIdDocument.externalEvents?.filter(
          (event) => event.label !== RECYCLER.toString(),
        ),
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the "${RECYCLER}" event is missing`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: [
          ...(massIdDocument.externalEvents ?? []).filter(
            (event) => event.name !== PICK_UP.toString(),
          ),
          stubBoldMassIdPickUpEvent({
            metadataAttributes: [[VEHICLE_LICENSE_PLATE_V2, undefined]],
          }),
        ],
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the old "${VEHICLE_LICENSE_PLATE_V1}" attribute is missing`,
  },
  {
    documents: [
      {
        ...massIdDocument,
        externalEvents: [
          ...(massIdDocument.externalEvents ?? []).filter(
            (event) => event.name !== PICK_UP.toString(),
          ),
          stubBoldMassIdPickUpEvent({
            metadataAttributes: [[VEHICLE_LICENSE_PLATE_V2, undefined]],
          }),
        ],
      },
    ],
    massIdAuditDocument,
    resultComment: processorErrors.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `when the new "${VEHICLE_LICENSE_PLATE_V2}" attribute is missing`,
  },
];
