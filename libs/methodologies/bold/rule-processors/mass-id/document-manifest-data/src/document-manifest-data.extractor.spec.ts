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
import { createExtractedWasteTypeEntry } from '@carrot-fndn/shared/document-extractor-transport-manifest';
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

const cdfManifestEvent: DocumentManifestEventSubject = {
  ...mtrManifestEvent,
  attachment: { attachmentId: 'att-cdf' } as never,
  documentNumber: 'CDF-001',
  documentType: 'CDF',
};

const recyclingManifests = {
  attachmentInfos: [
    { attachmentId: 'att-cdf', s3Bucket: 'bucket', s3Key: 'cdf-key' },
  ],
  documentManifestEvents: [cdfManifestEvent],
};

const cdfExtraction = (data: Record<string, unknown> = {}) => ({
  data: {
    documentNumber: { confidence: 'high', parsed: 'CDF-001' },
    extractionConfidence: 'high',
    issueDate: { confidence: 'high', parsed: '2024-01-01' },
    lowConfidenceFields: [],
    processingPeriod: {
      confidence: 'high',
      parsed: '01/01/2024 ate 31/01/2024',
    },
    transportManifests: { confidence: 'high', parsed: ['12345'] },
    wasteEntries: {
      confidence: 'high',
      parsed: [
        {
          code: '190812',
          description: 'Lodos de tratamento',
          quantity: 9000,
          unit: 'kg',
        },
      ],
    },
    ...data,
  },
  reviewReasons: [] as ReturnType<typeof lowConfidenceReviewReason>[],
  reviewRequired: false,
});

const runWithExtraction = async ({
  cdf,
  data,
  pickUpAttributes = [],
  recyclingManifestAttachments = recyclingManifests.attachmentInfos,
  reviewReasons,
  weighingEvents = [],
}: {
  cdf?: Error | ReturnType<typeof cdfExtraction> | undefined;
  data: Record<string, unknown>;
  pickUpAttributes?: { name: string; value: string }[];
  recyclingManifestAttachments?: AttachmentInfo[];
  reviewReasons: ReturnType<typeof blankFieldReviewReason>[];
  weighingEvents?: BoldDocumentEvent[];
}) => {
  const mtrExtraction = {
    data: {
      documentNumber: { confidence: 'high', parsed: '12345' },
      extractionConfidence: 'high',
      issueDate: { confidence: 'high', parsed: '01/01/2024' },
      lowConfidenceFields: [],
      receivingDate: { confidence: 'high', parsed: '01/01/2024' },
      transportDate: { confidence: 'high', parsed: '01/01/2024' },
      ...data,
    },
    reviewReasons,
    reviewRequired: true,
  };

  mockExtract.mockImplementation(({ s3Key }: { s3Key: string }) => {
    if (s3Key !== 'cdf-key') {
      return Promise.resolve(mtrExtraction);
    }

    return cdf instanceof Error ? Promise.reject(cdf) : Promise.resolve(cdf);
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
      metadata: {
        attributes: pickUpAttributes.map((attribute) => ({
          isPublic: true,
          ...attribute,
        })),
      },
    } as unknown as BoldDocumentEvent,
    ...(cdf && {
      recyclingManifests: {
        ...recyclingManifests,
        attachmentInfos: recyclingManifestAttachments,
      },
    }),
    weighingEvents,
  });
};

const findingCodes = (
  reasons: Parameters<typeof toCrossValidationFinding>[0][],
) => reasons.map((reason) => toCrossValidationFinding(reason).code);

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

    describe('when the MTR driver name is blank', () => {
      const exemptionJustification = {
        name: 'Driver Identifier Exemption Justification',
        value: 'The driver is not identified on this transport.',
      };

      it.each([
        {
          expectedFindings: [],
          expectedObservations: [
            'document-manifest-data.CROSS_VALIDATION.DRIVER_NAME_BLANK',
          ],
          justification: 'present',
          pickUpAttributes: [exemptionJustification],
        },
        {
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          justification: 'absent',
          pickUpAttributes: [],
        },
        {
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          justification: 'empty',
          pickUpAttributes: [{ ...exemptionJustification, value: '' }],
        },
      ])(
        'should report the expected findings when the Pick-up exemption justification is $justification',
        async ({
          expectedFindings,
          expectedObservations,
          pickUpAttributes,
        }) => {
          const result = await runWithExtraction({
            data: {
              blankFields: ['driverName'],
              driverName: { blank: true, confidence: 'low', parsed: '' },
            },
            pickUpAttributes,
            reviewReasons: [blankFieldReviewReason('driverName')],
          });

          expect(result.reviewRequired).toBe(expectedFindings.length > 0);
          expect(
            result.reviewReasons.map(
              (reason) => toCrossValidationFinding(reason).code,
            ),
          ).toEqual(expectedFindings);
          expect(
            result.observations.map(
              (reason) => toCrossValidationFinding(reason).code,
            ),
          ).toEqual(expectedObservations);
        },
      );

      it('should keep a low-confidence driver name read as a review reason even with the exemption justification', async () => {
        const result = await runWithExtraction({
          data: {
            driverName: { confidence: 'low', parsed: 'J0SE' },
            lowConfidenceFields: ['driverName'],
          },
          pickUpAttributes: [exemptionJustification],
          reviewReasons: [lowConfidenceReviewReason('driverName')],
        });

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toEqual([
          lowConfidenceReviewReason('driverName'),
        ]);
        expect(result.observations).toEqual([]);
      });
    });

    describe('when the MTR receiving date is blank', () => {
      const blankReceivingDate = {
        data: {
          blankFields: ['receivingDate'],
          receivingDate: blankDate,
        },
        reviewReasons: [blankFieldReviewReason('receivingDate')],
      };

      it.each([
        {
          cdf: cdfExtraction(),
          expectedFindings: [],
          expectedObservations: [
            'document-manifest-data.CROSS_VALIDATION.RECEIVING_DATE_BLANK',
          ],
          proof: 'a CDF that passes cross-validation',
        },
        {
          cdf: undefined,
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          proof: 'no CDF',
        },
        {
          cdf: cdfExtraction(),
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          proof: 'a CDF event without an attachment',
          recyclingManifestAttachments: [],
        },
        {
          cdf: cdfExtraction({
            transportManifests: { confidence: 'high', parsed: ['99999'] },
          }),
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          proof: 'a CDF that does not list the MTR',
        },
        {
          cdf: {
            ...cdfExtraction(),
            reviewReasons: [lowConfidenceReviewReason('recycler')],
            reviewRequired: true,
          },
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          proof: 'a CDF that requires review',
        },
        {
          cdf: new NoMatchingLayoutError('recyclingManifest', []),
          expectedFindings: [
            'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
          ],
          expectedObservations: [],
          proof: 'a CDF whose extraction fails',
        },
      ])(
        'should report the expected findings with $proof',
        async ({
          cdf,
          expectedFindings,
          expectedObservations,
          recyclingManifestAttachments,
        }) => {
          const result = await runWithExtraction({
            ...blankReceivingDate,
            ...(cdf && { cdf }),
            ...(recyclingManifestAttachments && {
              recyclingManifestAttachments,
            }),
          });

          expect(result.reviewRequired).toBe(expectedFindings.length > 0);
          expect(result.failMessages).toEqual([]);
          expect(findingCodes(result.reviewReasons)).toEqual(expectedFindings);
          expect(findingCodes(result.observations)).toEqual(
            expectedObservations,
          );
        },
      );

      it('should keep a weight divergence as a finding when a CDF proves receipt', async () => {
        const result = await runWithExtraction({
          ...blankReceivingDate,
          cdf: cdfExtraction(),
          data: {
            ...blankReceivingDate.data,
            wasteTypes: [
              createExtractedWasteTypeEntry({
                code: '190812',
                description: 'Lodos de tratamento',
                quantity: 5,
                unit: 't',
              }),
            ],
          },
          pickUpAttributes: [
            { name: 'Local Waste Classification ID', value: '190812' },
            {
              name: 'Local Waste Classification Description',
              value: 'Lodos de tratamento',
            },
          ],
          weighingEvents: [{ value: 9000 } as unknown as BoldDocumentEvent],
        });

        expect(result.reviewRequired).toBe(true);
        expect(findingCodes(result.reviewReasons)).toEqual([
          'document-manifest-data.CROSS_VALIDATION.WASTE_QUANTITY_WEIGHT_MISMATCH',
        ]);
        expect(findingCodes(result.observations)).toEqual([
          'document-manifest-data.CROSS_VALIDATION.RECEIVING_DATE_BLANK',
        ]);
      });

      it('should not read the CDF when the MTR already fails cross-validation', async () => {
        const result = await runWithExtraction({
          ...blankReceivingDate,
          cdf: cdfExtraction(),
          data: {
            ...blankReceivingDate.data,
            documentNumber: { confidence: 'high', parsed: '99999' },
          },
        });

        expect(mockExtract).toHaveBeenCalledTimes(1);
        expect(result.failMessages).not.toEqual([]);
        expect(findingCodes(result.reviewReasons)).toContain(
          'document-manifest-data.DOCUMENT_EXTRACTION.BLANK_FIELD',
        );
      });

      it('should not read the CDF when the receiving date is only low confidence', async () => {
        const result = await runWithExtraction({
          cdf: cdfExtraction(),
          data: {
            lowConfidenceFields: ['receivingDate'],
            receivingDate: { confidence: 'low', parsed: '01/01/2024' },
          },
          reviewReasons: [lowConfidenceReviewReason('receivingDate')],
        });

        expect(mockExtract).toHaveBeenCalledTimes(1);
        expect(result.reviewReasons).toEqual([
          lowConfidenceReviewReason('receivingDate'),
        ]);
        expect(result.observations).toEqual([]);
      });
    });

    describe('when the MTR vehicle plate cannot be compared', () => {
      it.each([
        {
          expectedObservation:
            'document-manifest-data.CROSS_VALIDATION.VEHICLE_PLATE_BLANK',
          plate: 'blank',
          reason: blankFieldReviewReason('vehiclePlate'),
          vehiclePlate: blankDate,
        },
        {
          expectedObservation:
            'document-manifest-data.CROSS_VALIDATION.VEHICLE_PLATE_ILLEGIBLE',
          plate: 'illegible',
          reason: lowConfidenceReviewReason('vehiclePlate'),
          vehiclePlate: { confidence: 'low', parsed: '' },
        },
      ])(
        'should accept a $plate plate with an observation',
        async ({ expectedObservation, reason, vehiclePlate }) => {
          const result = await runWithExtraction({
            data: { vehiclePlate },
            pickUpAttributes: [
              { name: 'Vehicle License Plate', value: 'ABC1D23' },
            ],
            reviewReasons: [reason],
          });

          expect(result.reviewRequired).toBe(false);
          expect(result.reviewReasons).toEqual([]);
          expect(findingCodes(result.observations)).toEqual([
            expectedObservation,
          ]);
        },
      );

      it('should keep a plate read with low confidence, such as two distinct plates, as a review reason', async () => {
        const result = await runWithExtraction({
          data: {
            lowConfidenceFields: ['vehiclePlate'],
            vehiclePlate: { confidence: 'low', parsed: 'XYZ9W87' },
          },
          pickUpAttributes: [
            { name: 'Vehicle License Plate', value: 'ABC1D23' },
          ],
          reviewReasons: [lowConfidenceReviewReason('vehiclePlate')],
        });

        expect(result.reviewRequired).toBe(true);
        expect(result.reviewReasons).toEqual([
          lowConfidenceReviewReason('vehiclePlate'),
        ]);
        expect(result.observations).toEqual([]);
      });

      it('should keep an unread plate as a review reason when another MTR read its plate with low confidence', async () => {
        const unreadPlate = {
          data: {
            documentNumber: { confidence: 'high', parsed: '12345' },
            extractionConfidence: 'high',
            issueDate: { confidence: 'high', parsed: '01/01/2024' },
            lowConfidenceFields: ['vehiclePlate'],
            receivingDate: { confidence: 'high', parsed: '01/01/2024' },
            transportDate: { confidence: 'high', parsed: '01/01/2024' },
            vehiclePlate: { confidence: 'low', parsed: '' },
          },
          reviewReasons: [lowConfidenceReviewReason('vehiclePlate')],
          reviewRequired: true,
        };
        const ambiguousPlate = {
          ...unreadPlate,
          data: {
            ...unreadPlate.data,
            vehiclePlate: { confidence: 'low', parsed: 'XYZ9W87' },
          },
        };

        mockExtract.mockImplementation(({ s3Key }: { s3Key: string }) =>
          Promise.resolve(s3Key === 'key-1' ? ambiguousPlate : unreadPlate),
        );

        const result = await crossValidateWithTextract({
          attachmentInfos: [
            { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key-1' },
            { attachmentId: 'att-2', s3Bucket: 'bucket', s3Key: 'key-2' },
          ],
          documentManifestEvents: [
            mtrManifestEvent,
            {
              ...mtrManifestEvent,
              attachment: { attachmentId: 'att-2' } as never,
            },
          ],
          ...noRelatedEvents,
        });

        expect(result.reviewReasons).toEqual([
          lowConfidenceReviewReason('vehiclePlate'),
          lowConfidenceReviewReason('vehiclePlate'),
        ]);
        expect(result.observations).toEqual([]);
      });

      it('should keep a confidently read plate that differs from Pick-up as a mismatch', async () => {
        const result = await runWithExtraction({
          data: {
            vehiclePlate: { confidence: 'high', parsed: 'XYZ9W87' },
          },
          pickUpAttributes: [
            { name: 'Vehicle License Plate', value: 'ABC1D23' },
          ],
          reviewReasons: [],
        });

        expect(result.reviewRequired).toBe(true);
        expect(findingCodes(result.reviewReasons)).toEqual([
          'document-manifest-data.CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH',
        ]);
        expect(result.observations).toEqual([]);
      });
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
