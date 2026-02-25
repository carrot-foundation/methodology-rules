import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  AttachmentInfo,
  DocumentManifestEventSubject,
} from './document-manifest-data.helpers';

const mockExtract = jest.fn();

jest.mock('@carrot-fndn/shared/document-extractor', () =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  ({
    ...jest.requireActual('@carrot-fndn/shared/document-extractor'),
    createDocumentExtractor: () => ({
      extract: mockExtract,
    }),
  }),
);

// eslint-disable-next-line import/first -- Must import after mock is set up
import { crossValidateWithTextract } from './document-manifest-data.extractor';

const STUB_BR_ADDRESS = { countryCode: 'BR', countryState: 'SP' };

const noRelatedEvents: {
  dropOffEvent: undefined;
  haulerEvent: undefined;
  pickUpEvent: undefined;
  recyclerEvent: undefined;
  wasteGeneratorEvent: undefined;
  weighingEvents: DocumentEvent[];
} = {
  dropOffEvent: undefined,
  haulerEvent: undefined,
  pickUpEvent: undefined,
  recyclerEvent: undefined,
  wasteGeneratorEvent: undefined,
  weighingEvents: [],
};

describe('crossValidateWithTextract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty result when attachmentInfos is empty', async () => {
    const result = await crossValidateWithTextract({
      attachmentInfos: [],
      documentManifestEvents: [],
      ...noRelatedEvents,
    });

    expect(result).toEqual({
      crossValidation: {},
      failMessages: [],
      failReasons: [],
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
      failMessages: [],
      failReasons: [],
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

  it('should enrich MTR events with related events for cross-validation', async () => {
    const attachmentInfos: AttachmentInfo[] = [
      { attachmentId: 'att-1', s3Bucket: 'bucket', s3Key: 'key' },
    ];
    const documentManifestEvents: DocumentManifestEventSubject[] = [
      {
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
      },
    ];

    const pickUpEvent = {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01',
      metadata: { attributes: [] },
    } as unknown as DocumentEvent;

    const dropOffEvent = {
      address: STUB_BR_ADDRESS,
      externalCreatedAt: '2024-01-01',
    } as unknown as DocumentEvent;

    const recyclerEvent = {
      participant: { name: 'Recycler Corp' },
    } as unknown as DocumentEvent;

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
      {
        attachment: { attachmentId: 'att-1' } as never,
        documentNumber: '12345',
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

    const pickUpEvent = {
      externalCreatedAt: '2024-01-01',
      metadata: { attributes: [] },
    } as unknown as DocumentEvent;

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
