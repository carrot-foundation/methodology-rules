import {
  stubAddress,
  stubBoldMassIdRecyclingManifestEvent,
  stubBoldMassIdTransportManifestEvent,
  stubDocumentEvent,
  stubDocumentEventAttachment,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { RESULT_COMMENTS } from './document-manifest.constants';
import { type DocumentManifestType } from './document-manifest.processor';

const { ACTOR, RECYCLING_MANIFEST, TRANSPORT_MANIFEST } = DocumentEventName;

const { DOCUMENT_NUMBER, DOCUMENT_TYPE, EXEMPTION_JUSTIFICATION, ISSUE_DATE } =
  NewDocumentEventAttributeName;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { CUBIC_METER, DATE } = MethodologyDocumentEventAttributeFormat;

const attributeErrorMessages: Record<string, string> = {
  [DOCUMENT_NUMBER]: RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER,
  [DOCUMENT_TYPE]: RESULT_COMMENTS.MISSING_DOCUMENT_TYPE,
  [ISSUE_DATE]: RESULT_COMMENTS.MISSING_ISSUE_DATE,
};

const documentManifestType = random<DocumentManifestType>();

const documentManifestTypeStub = {
  [RECYCLING_MANIFEST]: stubBoldMassIdRecyclingManifestEvent,
  [TRANSPORT_MANIFEST]: stubBoldMassIdTransportManifestEvent,
};

const sameAddress = stubAddress();

const defaultEvents = {
  [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
    address: sameAddress,
    label: RECYCLER,
    name: ACTOR,
  }),
};

export const documentManifestTestCases = [
  {
    documentManifestType,
    events: {
      [documentManifestType]: undefined,
    },
    resultComment: RESULT_COMMENTS.MISSING_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document does not have a ${documentManifestType} event`,
  },
  ...[ISSUE_DATE, DOCUMENT_NUMBER, DOCUMENT_TYPE].map((attribute) => ({
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [[attribute, undefined]],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
      ...defaultEvents,
    },
    // eslint-disable-next-line security/detect-object-injection
    resultComment: attributeErrorMessages[attribute],
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event without a ${attribute}`,
  })),
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          [DOCUMENT_NUMBER, undefined],
          [DOCUMENT_TYPE, undefined],
        ],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
      ...defaultEvents,
    },
    resultComment: `${RESULT_COMMENTS.MISSING_DOCUMENT_TYPE} ${RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event without a ${DOCUMENT_NUMBER} and ${DOCUMENT_TYPE}`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'MTR',
            }),
          ],
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.INCORRECT_ATTACHMENT_LABEL,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event with a wrong attachment label`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          {
            format: CUBIC_METER,
            name: ISSUE_DATE,
            value: '2025-03-19',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.INVALID_ISSUE_DATE_FORMAT(CUBIC_METER),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event ${ISSUE_DATE} with a wrong format`,
  },
  {
    documentManifestType,
    events: {
      [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
        address: {
          ...sameAddress,
          countryCode: 'BR',
        },
        label: RECYCLER,
        name: ACTOR,
      }),
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [[DOCUMENT_TYPE, 'EMITIARE']],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
    },
    resultComment: RESULT_COMMENTS.INVALID_BR_DOCUMENT_TYPE('EMITIARE'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event ${DOCUMENT_TYPE} with a wrong format`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        partialDocumentEvent: {
          address: sameAddress,
          value: 0,
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.INVALID_EVENT_VALUE('0'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${documentManifestType} event with a value of 0`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: documentManifestType,
            }),
          ],
        },
        withExemptionJustification: true,
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${EXEMPTION_JUSTIFICATION} and a attachment`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [[EXEMPTION_JUSTIFICATION, undefined]],
        partialDocumentEvent: {
          address: sameAddress,
        },
        withExemptionJustification: true,
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.MISSING_ATTRIBUTES,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has no attachment and no ${EXEMPTION_JUSTIFICATION}`,
  },
  {
    documentManifestType,
    events: {
      [`${ACTOR}-${RECYCLER}`]: undefined,
    },
    resultComment: RESULT_COMMENTS.MISSING_RECYCLER_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has no ${RECYCLER} event`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        partialDocumentEvent: {
          address: sameAddress,
        },
        withExemptionJustification: true,
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the MassID document has a ${EXEMPTION_JUSTIFICATION} without attachment`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          [DOCUMENT_TYPE, 'MTR'],
          [DOCUMENT_NUMBER, '0'],
          {
            format: DATE,
            name: ISSUE_DATE,
            value: '2025-03-20',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: documentManifestType,
            }),
          ],
          value: 100,
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
      documentNumber: '0',
      documentType: 'MTR',
      issueDate: '2025-03-20',
      value: 100,
    }),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the MassID document has a valid ${TRANSPORT_MANIFEST} event and attachment`,
  },
  {
    documentManifestType,
    events: {
      [`${documentManifestType}-1`]: documentManifestTypeStub[
        documentManifestType
      ]({
        metadataAttributes: [
          [DOCUMENT_TYPE, 'MTR'],
          [DOCUMENT_NUMBER, '1'],
          {
            format: DATE,
            name: ISSUE_DATE,
            value: '2025-03-21',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: documentManifestType,
            }),
          ],
          value: 1000,
        },
      }),
      [`${documentManifestType}-2`]: documentManifestTypeStub[
        documentManifestType
      ]({
        metadataAttributes: [
          [DOCUMENT_TYPE, 'MTR'],
          [DOCUMENT_NUMBER, '2'],
          {
            format: DATE,
            name: ISSUE_DATE,
            value: '2025-03-18',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: documentManifestType,
            }),
          ],
          value: 200,
        },
      }),
      [documentManifestType]: undefined,
      ...defaultEvents,
    },
    resultComment: `${RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
      documentNumber: '1',
      documentType: 'MTR',
      issueDate: '2025-03-21',
      value: 1000,
    })} ${RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
      documentNumber: '2',
      documentType: 'MTR',
      issueDate: '2025-03-18',
      value: 200,
    })}`,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `the MassID document has two valid ${documentManifestType} events and attachments`,
  },
  {
    documentManifestType: TRANSPORT_MANIFEST as DocumentManifestType,
    events: {
      [TRANSPORT_MANIFEST]: documentManifestTypeStub[TRANSPORT_MANIFEST]({
        metadataAttributes: [[EXEMPTION_JUSTIFICATION, 'Some justification']],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: TRANSPORT_MANIFEST,
            }),
          ],
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has both a valid ${TRANSPORT_MANIFEST} attachment and ${EXEMPTION_JUSTIFICATION}`,
  },
];

export const exceptionTestCases = [
  {
    documentManifestType: RECYCLING_MANIFEST as DocumentManifestType,
    events: {},
    resultComment: RESULT_COMMENTS.ADDRESS_MISMATCH,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `the MassID document has a ${RECYCLING_MANIFEST} event with a different address than the ${RECYCLER} event`,
  },
];
