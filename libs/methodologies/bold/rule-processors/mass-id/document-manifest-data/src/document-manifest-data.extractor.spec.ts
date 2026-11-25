import type { BoldDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  AttachmentInfo,
  DocumentManifestEventSubject,
} from './document-manifest-data.helpers';

const { createDocumentExtractorArguments, mockExtract } = vi.hoisted(() => ({
  createDocumentExtractorArguments: [] as unknown[][],
  mockExtract: vi.fn(),
}));

vi.mock('@carrot-fndn/shared/document-extractor', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@carrot-fndn/shared/document-extractor')
  >()),
  createDocumentExtractor: (...arguments_: unknown[]) => {
    createDocumentExtractorArguments.push(arguments_);

    return { extract: mockExtract };
  },
}));

// eslint-disable-next-line import/first -- Must import after mock is set up
import {
  blankFieldReviewReason,
  lowConfidenceReviewReason,
  NoMatchingLayoutError,
} from '@carrot-fndn/shared/document-extractor';
// eslint-disable-next-line import/first -- Must import after mock is set up
import {
  pdfTextLayerExtractor,
  textExtractor,
} from '@carrot-fndn/shared/text-extractor';

// eslint-disable-next-line import/first -- Must import after mock is set up
import { crossValidateWithTextract } from './document-manifest-data.extractor';
// eslint-disable-next-line import/first -- Must import after mock is set up
import { toCrossValidationFinding } from './document-manifest-data.findings';

const STUB_BR_ADDRESS = { countryCode: 'BR', countryState: 'SP' };

const noRelatedEvents: {
  dropOffEvent: undefined;
  haulerEvent: undefined;
  pickUpEvent: undefined;
  recyclerEvent: undefined;
  wasteGeneratorEvent: undefined;
  weighingEvents: BoldDocumentEvent[];
} = {
  dropOffEvent: undefined,
  haulerEvent: undefined,
  pickUpEvent: undefined,
  recyclerEvent: undefined,
  wasteGeneratorEvent: undefined,
  weighingEvents: [],
};

const mtrManifestEvent: DocumentManifestEventSubject = {
  attachment: { attachmentId: 'att-1' } as never,
  documentNumber: '12345',
  documentType: 'MTR',
  eventAddressId: 'addr-1',
  eventValue: 100,
  exemptionJustification: undefined,
  hasWrongLabelAttachment: false,
  issueDateAttribute: {
    name: 'Issue Date',
    value: '2024-01-01',
  } as never,
  recyclerCountryCode: 'BR',
};

const runWithExtraction = async ({
  data,
  reviewReasons,
}: {
  data: Record<string, unknown>;
  reviewReasons: ReturnType<typeof blankFieldReviewReason>[];
}) => {
  mockExtract.mockResolvedValue({
    data: {
      documentNumber: { confidence: 'high', parsed: '12345' },
      extractionConfidence: 'high',
      issueDate: { confidence: 'high', parsed: '01/01/2024' },
      lowConfidenceFields: [],
      receivingDate: { confidence: 'high', parsed: '01/01/2024' },
      ...data,
    },
    reviewReasons,
    reviewRequired: true,
  });

  return crossValidateWithTextract({
    attachmentInfos: [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ],
    documentManifestEvents: [mtrManifestEvent],
    ...noRelatedEvents,
    dropOffEvent: {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01T12:00:00.000Z',
    } as unknown as BoldDocumentEvent,
    pickUpEvent: {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01T12:00:00.000Z',
      metadata: { attributes: [] },
    } as unknown as BoldDocumentEvent,
  });
};
describe('crossValidateWithTextract', () => {
  it('should opt in to the PDF text-layer fallback', () => {
    expect(createDocumentExtractorArguments).toEqual([
      [textExtractor, pdfTextLayerExtractor],
    ]);
  });

  it('should return empty result when attachmentInfos is empty', async () => {
    const result = await crossValidateWithTextract({
      attachmentInfos: [],
      documentManifestEvents: [],
      ...noRelatedEvents,
    });

    expect(result).toEqual({
      crossValidation: {},
      extractionMetadata: {},
      failMessages: [],
      failReasons: [],
      observations: [],
      passMessages: [],
      reviewReasons: [],
      reviewRequired: false,
    });
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('should skip when eventSubject is nil', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents: [],
      ...noRelatedEvents,
    });

    expect(result).toEqual({
      crossValidation: {},
      extractionMetadata: {},
      failMessages: [],
      failReasons: [],
      observations: [],
      passMessages: [],
      reviewReasons: [],
      reviewRequired: false,
    });
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('should set reviewRequired when document type is unknown', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '123',
        documentType: 'UNKNOWN_TYPE',
        eventAddressId: 'addr-1',
        eventValue: 100,
        exemptionJustification: undefined,
        hasWrongLabelAttachment: false,
        issueDateAttribute: undefined,
        recyclerCountryCode: 'BR',
      },
    ];

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_DOCUMENT_TYPE',
          description: expect.stringContaining('att-1') as string,
        }),
      ]),
    );
  });

  it('should validate extraction result and collect fail messages', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '123',
        documentType: 'CDF',
        eventAddressId: 'addr-1',
        eventValue: 100,
        exemptionJustification: undefined,
        hasWrongLabelAttachment: false,
        issueDateAttribute: {
          name: 'Issue Date',
          value: '2024-01-01',
        } as never,
        recyclerCountryCode: 'BR',
      },
    ];

    mockExtract.mockResolvedValue({
      data: {
        documentNumber: { confidence: 'high', parsed: '456' },
        extractionConfidence: 'high',
        issueDate: { confidence: 'high', parsed: '2024-01-01' },
      },
      reviewReasons: [],
      reviewRequired: false,
    });

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.failMessages.length).toBeGreaterThan(0);
    expect(result.failMessages[0]).toContain('Document Number');
  });

  it('should set reviewRequired when extraction result requires review', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '123',
        documentType: 'CDF',
        eventAddressId: 'addr-1',
        eventValue: 100,
        exemptionJustification: undefined,
        hasWrongLabelAttachment: false,
        issueDateAttribute: {
          name: 'Issue Date',
          value: '2024-01-01',
        } as never,
        recyclerCountryCode: 'BR',
      },
    ];

    mockExtract.mockResolvedValue({
      data: {
        documentNumber: { confidence: 'high', parsed: '123' },
        extractionConfidence: 'high',
        issueDate: { confidence: 'high', parsed: '2024-01-01' },
      },
      reviewReasons: [
        { code: 'SOME_REVIEW_CODE', description: 'Some review reason' },
      ],
      reviewRequired: true,
    });

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ description: 'Some review reason' }),
      ]),
    );
  });

  it.each([
    { documentType: 'MTR', extractorDocumentType: 'transportManifest' },
    { documentType: 'CDF', extractorDocumentType: 'recyclingManifest' },
  ] as const)(
    'should fail with a layout not recognized reason when the $documentType attachment matches no layout',
    async ({ documentType, extractorDocumentType }) => {
      const attachmentInfos: AttachmentInfo[] = [
        { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
      ];
      const documentManifestEvents: DocumentManifestEventSubject[] = [
        {
          attachment: { attachmentId: 'att-1' } as never,
          documentNumber: '123',
          documentType,
          eventAddressId: 'addr-1',
          eventValue: 100,
          exemptionJustification: undefined,
          hasWrongLabelAttachment: false,
          issueDateAttribute: undefined,
          recyclerCountryCode: 'BR',
        },
      ];

      mockExtract.mockRejectedValue(
        new NoMatchingLayoutError(extractorDocumentType, ['layout-a']),
      );

      const result = await crossValidateWithTextract({
        attachmentInfos,
        documentManifestEvents,
        ...noRelatedEvents,
      });

      expect(
        result.failReasons.map((reason) => toCrossValidationFinding(reason)),
      ).toEqual([
        {
          code: 'document-manifest-data.DOCUMENT_EXTRACTION.LAYOUT_NOT_RECOGNIZED',
          defaultOwner: 'INTEGRATOR',
        },
      ]);
    },
  );

  it('should fail when extraction errors occur', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '123',
        documentType: 'CDF',
        eventAddressId: 'addr-1',
        eventValue: 100,
        exemptionJustification: undefined,
        hasWrongLabelAttachment: false,
        issueDateAttribute: undefined,
        recyclerCountryCode: 'BR',
      },
    ];

    mockExtract.mockRejectedValue(new Error('Extraction failed'));

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.failMessages[0]).toContain(
      'Document extraction failed for attachment att-1: Extraction failed',
    );
    expect(result.failReasons).toEqual([
      {
        code: 'EXTRACTION_FAILED',
        description:
          'Document extraction failed for attachment att-1: Extraction failed',
      },
    ]);
  });

  it('should fail with unknown error for non-Error exceptions', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '123',
        documentType: 'CDF',
        eventAddressId: 'addr-1',
        eventValue: 100,
        exemptionJustification: undefined,
        hasWrongLabelAttachment: false,
        issueDateAttribute: undefined,
        recyclerCountryCode: 'BR',
      },
    ];

    mockExtract.mockRejectedValue('string error');

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.failMessages[0]).toContain('Unknown error');
  });

  describe('when MTR fields are blank on the document', () => {
    const blankDate = { blank: true, confidence: 'low', parsed: '' };

    const runWithBlankFields = async (blankFields: string[]) =>
      runWithExtraction({
        data: {
          blankFields,
          ...Object.fromEntries(blankFields.map((field) => [field, blankDate])),
        },
        reviewReasons: blankFields.map((field) =>
          blankFieldReviewReason(field),
        ),
      });

    it('should accept a blank transport date with a blank transport date observation', async () => {
      const result = await runWithBlankFields(['transportDate']);

      expect(result.reviewReasons).toEqual([]);
      expect(result.reviewRequired).toBe(false);
      expect(result.crossValidation).toMatchObject({
        blankFields: ['transportDate'],
        transportDate: { extracted: '', isMatch: null },
      });
      expect(
        result.observations.map((reason) => toCrossValidationFinding(reason)),
      ).toEqual([
        {
          code: 'document-manifest-data.CROSS_VALIDATION.TRANSPORT_DATE_BLANK',
          defaultOwner: 'TO_CONFIRM',
        },
      ]);
    });

    it('should keep a low-confidence transport date read as a review reason without the blank observation', async () => {
      const result = await runWithExtraction({
        data: {
          lowConfidenceFields: ['transportDate'],
          transportDate: { confidence: 'low', parsed: '01/01/2024' },
        },
        reviewReasons: [lowConfidenceReviewReason('transportDate')],
      });

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toEqual([
        lowConfidenceReviewReason('transportDate'),
      ]);
      expect(result.observations).toEqual([]);
    });

    it('should report any other blank field as a blank field finding', async () => {
      const result = await runWithBlankFields([
        'transportDate',
        'receivingDate',
      ]);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toEqual([
        blankFieldReviewReason('receivingDate'),
      ]);
      expect(
        result.reviewReasons.map((reason) => toCrossValidationFinding(reason)),
      ).toEqual([
        {
          code: 'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          defaultOwner: 'RECYCLER',
        },
      ]);
    });
  });

  it('should enrich MTR events with related events for cross-validation', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents = [mtrManifestEvent];

    const pickUpEvent = {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01',
      metadata: { attributes: [] },
    } as unknown as BoldDocumentEvent;

    const dropOffEvent = {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01',
    } as unknown as BoldDocumentEvent;

    const recyclerEvent = {
      participant: { name: 'Recycler Corp' },
    } as unknown as BoldDocumentEvent;

    mockExtract.mockResolvedValue({
      data: {
        documentNumber: { confidence: 'high', parsed: '12345' },
        extractionConfidence: 'high',
        issueDate: { confidence: 'high', parsed: '2024-01-01' },
      },
      reviewReasons: [],
      reviewRequired: false,
    });

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      dropOffEvent,
      haulerEvent: undefined,
      pickUpEvent,
      recyclerEvent,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    });

    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(result.failMessages).toHaveLength(0);
  });

  it('should use basic validation for CDF events even when related events are provided', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      { ...mtrManifestEvent, documentType: 'CDF' },
    ];

    const pickUpEvent = {
      externalCreatedAt: '2024-01-01',
      metadata: { attributes: [] },
    } as unknown as BoldDocumentEvent;

    mockExtract.mockResolvedValue({
      data: {
        documentNumber: { confidence: 'high', parsed: '12345' },
        extractionConfidence: 'high',
        issueDate: { confidence: 'high', parsed: '2024-01-01' },
      },
      reviewReasons: [],
      reviewRequired: false,
    });

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      dropOffEvent: undefined,
      haulerEvent: undefined,
      pickUpEvent,
      recyclerEvent: undefined,
      wasteGeneratorEvent: undefined,
      weighingEvents: [],
    });

    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(result.failMessages).toHaveLength(0);
  });
});
