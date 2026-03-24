import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubAddress,
  stubBoldMassIDRecyclingManifestEvent,
  stubBoldMassIDTransportManifestEvent,
  stubDocumentEvent,
  stubDocumentEventAttachment,
} from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './document-manifest-data.constants';
import { type DocumentManifestType } from './document-manifest-data.processor';

interface DocumentManifestDataTestCase extends RuleTestCase {
  crossValidationFailMessages?: string[];
  crossValidationPassMessages?: string[];
  crossValidationReviewReasons?: Array<{ code: string; description: string }>;
  documentManifestType: DocumentManifestType;
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

const attributeErrorMessages: Record<string, string> = {
  'Document Number': RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER,
  'Document Type': RESULT_COMMENTS.MISSING_DOCUMENT_TYPE,
  'Issue Date': RESULT_COMMENTS.MISSING_ISSUE_DATE,
};

const documentManifestType: DocumentManifestType = 'Recycling Manifest';

const documentManifestTypeStub = {
  'Recycling Manifest': stubBoldMassIDRecyclingManifestEvent,
  'Transport Manifest': stubBoldMassIDTransportManifestEvent,
};

const sameAddress = stubAddress({
  city: 'Cidade Centro',
  countryCode: 'BR',
  latitude: -23.5505,
  longitude: -46.6333,
  number: '100',
  street: 'Rua Modelo',
  zipCode: '01310-100',
});

const defaultEvents = {
  'ACTOR-Recycler': stubDocumentEvent({
    address: sameAddress,
    label: 'Recycler',
    name: 'ACTOR',
  }),
};

export const documentManifestDataTestCases: DocumentManifestDataTestCase[] = [
  {
    documentManifestType,
    events: {
      [documentManifestType]: undefined,
    },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.MISSING_EVENT(documentManifestType),
    resultStatus: 'FAILED',
    scenario: `The MassID document does not have a ${documentManifestType} event`,
  },
  ...(['Issue Date', 'Document Number', 'Document Type'] as const).map(
    (attribute) => ({
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
      manifestExample: true,
      resultComment: attributeErrorMessages[attribute]!,
      resultStatus: 'FAILED',
      scenario: `The MassID document has a ${documentManifestType} event without a ${attribute}`,
    }),
  ),
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          ['Document Number', undefined],
          ['Document Type', undefined],
        ],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
      ...defaultEvents,
    },
    manifestExample: true,
    resultComment: `${RESULT_COMMENTS.MISSING_DOCUMENT_TYPE} ${RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER}`,
    resultStatus: 'FAILED',
    scenario: `The MassID document has a ${documentManifestType} event without a Document Number and Document Type`,
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
    manifestExample: true,
    resultComment:
      RESULT_COMMENTS.INCORRECT_ATTACHMENT_LABEL(documentManifestType),
    resultStatus: 'FAILED',
    scenario: `The MassID document has a ${documentManifestType} event with a wrong attachment label`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          {
            format: 'CUBIC_METER',
            name: 'Issue Date',
            value: '2025-03-19',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.INVALID_ISSUE_DATE_FORMAT('CUBIC_METER'),
    resultStatus: 'FAILED',
    scenario: `The MassID document has a ${documentManifestType} event Issue Date with a wrong format`,
  },
  {
    documentManifestType,
    events: {
      'ACTOR-Recycler': stubDocumentEvent({
        address: sameAddress,
        label: 'Recycler',
        name: 'ACTOR',
      }),
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [['Document Type', 'EMITIARE']],
        partialDocumentEvent: {
          address: sameAddress,
        },
      }),
    },
    resultComment: RESULT_COMMENTS.INVALID_BR_DOCUMENT_TYPE('EMITIARE'),
    resultStatus: 'FAILED',
    scenario: `The MassID document has a ${documentManifestType} event Document Type with a wrong format`,
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
    resultComment:
      RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED(
        documentManifestType,
      ),
    resultStatus: 'FAILED',
    scenario: `The MassID document has an Exemption Justification and an attachment`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [['Exemption Justification', undefined]],
        partialDocumentEvent: {
          address: sameAddress,
        },
        withExemptionJustification: true,
      }),
      ...defaultEvents,
    },
    resultComment: RESULT_COMMENTS.MISSING_ATTRIBUTES(documentManifestType),
    resultStatus: 'FAILED',
    scenario: `The MassID document has no attachment and no Exemption Justification`,
  },
  {
    documentManifestType,
    events: {
      'ACTOR-Recycler': undefined,
    },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.MISSING_RECYCLER_EVENT,
    resultStatus: 'FAILED',
    scenario: `The MassID document has no Recycler event`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          [
            'Exemption Justification',
            'Equipment undergoing scheduled maintenance',
          ],
        ],
        partialDocumentEvent: {
          address: sameAddress,
        },
        withExemptionJustification: true,
      }),
      ...defaultEvents,
    },
    manifestExample: true,
    resultComment:
      RESULT_COMMENTS.PROVIDE_EXEMPTION_JUSTIFICATION(documentManifestType),
    resultStatus: 'PASSED',
    scenario: `The MassID document has a Exemption Justification without attachment`,
  },
  {
    documentManifestType,
    events: {
      [documentManifestType]: documentManifestTypeStub[documentManifestType]({
        metadataAttributes: [
          ['Document Type', 'CDF'],
          ['Document Number', 'CDF-2024-001234'],
          {
            format: 'DATE',
            name: 'Issue Date',
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
    manifestExample: true,
    manifestFields: { includeValue: true },
    resultComment: RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
      documentNumber: 'CDF-2024-001234',
      documentType: 'CDF',
      issueDate: '2025-03-20',
      value: 100,
    }),
    resultStatus: 'PASSED',
    scenario: `The MassID document has a valid ${documentManifestType} event and attachment`,
  },
  {
    documentManifestType,
    events: {
      [`${documentManifestType}-1`]: documentManifestTypeStub[
        documentManifestType
      ]({
        metadataAttributes: [
          ['Document Type', 'CDF'],
          ['Document Number', '1'],
          {
            format: 'DATE',
            name: 'Issue Date',
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
          ['Document Type', 'CDF'],
          ['Document Number', '2'],
          {
            format: 'DATE',
            name: 'Issue Date',
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
      documentType: 'CDF',
      issueDate: '2025-03-21',
      value: 1000,
    })} ${RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
      documentNumber: '2',
      documentType: 'CDF',
      issueDate: '2025-03-18',
      value: 200,
    })}`,
    resultStatus: 'PASSED',
    scenario: `The MassID document has two valid ${documentManifestType} events and attachments`,
  },
  {
    documentManifestType: 'Transport Manifest' as DocumentManifestType,
    events: {
      'Transport Manifest': documentManifestTypeStub['Transport Manifest']({
        metadataAttributes: [['Exemption Justification', 'Some justification']],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'Transport Manifest',
            }),
          ],
        },
      }),
      ...defaultEvents,
    },
    resultComment:
      RESULT_COMMENTS.ATTACHMENT_AND_JUSTIFICATION_PROVIDED(
        'Transport Manifest',
      ),
    resultStatus: 'FAILED',
    scenario: `The MassID document has both a valid Transport Manifest attachment and Exemption Justification`,
  },
];

export const crossValidationTestCases: DocumentManifestDataTestCase[] = [
  {
    crossValidationFailMessages: ['Document number mismatch'],
    documentManifestType: 'Transport Manifest' as DocumentManifestType,
    events: {
      'Transport Manifest': stubBoldMassIDTransportManifestEvent({
        metadataAttributes: [
          ['Document Type', 'MTR'],
          ['Document Number', '123'],
          {
            format: 'DATE',
            name: 'Issue Date',
            value: '2025-01-01',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'Transport Manifest',
            }),
          ],
          value: 100,
        },
      }),
      ...defaultEvents,
    },
    resultComment: 'Document number mismatch',
    resultStatus: 'FAILED',
    scenario: 'Cross-validation finds mismatches in the document',
  },
  {
    crossValidationReviewReasons: [
      { code: 'LOW_CONFIDENCE', description: 'Low confidence extraction' },
    ],
    documentManifestType: 'Transport Manifest' as DocumentManifestType,
    events: {
      'Transport Manifest': stubBoldMassIDTransportManifestEvent({
        metadataAttributes: [
          ['Document Type', 'MTR'],
          ['Document Number', '123'],
          {
            format: 'DATE',
            name: 'Issue Date',
            value: '2025-01-01',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'Transport Manifest',
            }),
          ],
          value: 100,
        },
      }),
      ...defaultEvents,
    },
    resultComment: 'Review required: Low confidence extraction',
    resultStatus: 'REVIEW_REQUIRED',
    scenario: 'Cross-validation requires review',
  },
  {
    crossValidationPassMessages: [
      'The attachment pass message from extraction',
    ],
    documentManifestType: 'Transport Manifest' as DocumentManifestType,
    events: {
      'Transport Manifest': stubBoldMassIDTransportManifestEvent({
        metadataAttributes: [
          ['Document Type', 'MTR'],
          ['Document Number', '123'],
          {
            format: 'DATE',
            name: 'Issue Date',
            value: '2025-01-01',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'Transport Manifest',
            }),
          ],
          value: 100,
        },
      }),
      ...defaultEvents,
    },
    resultComment: 'The attachment pass message from extraction',
    resultStatus: 'PASSED',
    scenario: 'Cross-validation provides pass messages',
  },
  {
    crossValidationFailMessages: ['Document number mismatch'],
    crossValidationReviewReasons: [
      { code: 'LOW_CONFIDENCE', description: 'Low confidence extraction' },
    ],
    documentManifestType: 'Transport Manifest' as DocumentManifestType,
    events: {
      'Transport Manifest': stubBoldMassIDTransportManifestEvent({
        metadataAttributes: [
          ['Document Type', 'MTR'],
          ['Document Number', '123'],
          {
            format: 'DATE',
            name: 'Issue Date',
            value: '2025-01-01',
          },
        ],
        partialDocumentEvent: {
          address: sameAddress,
          attachments: [
            stubDocumentEventAttachment({
              label: 'Transport Manifest',
            }),
          ],
          value: 100,
        },
      }),
      ...defaultEvents,
    },
    resultComment:
      'Document number mismatch Review required: Low confidence extraction',
    resultStatus: 'FAILED',
    scenario:
      'Cross-validation finds mismatches and also requires review for other fields',
  },
];

export const exceptionTestCases: DocumentManifestDataTestCase[] = [
  {
    documentManifestType: 'Recycling Manifest' as DocumentManifestType,
    events: {},
    resultComment: RESULT_COMMENTS.ADDRESS_MISMATCH,
    resultStatus: 'FAILED',
    scenario: `The MassID document has a Recycling Manifest event with a different address than the Recycler event`,
  },
];
