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

const noRelatedEvents = {
  dropOffEvent: undefined,
  haulerEvent: undefined,
  pickUpEvent: undefined,
  recyclerEvent: undefined,
  wasteGeneratorEvent: undefined,
} as const;

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
      failMessages: [],
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
      failMessages: [],
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
    expect(result.reviewReasons).toContain(
      'Unknown document type, cannot perform cross-validation for attachment att-1',
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
      reviewReasons: ['Some review reason'],
      reviewRequired: true,
    });

    const result = await crossValidateWithTextract({
      attachmentInfos,
      documentManifestEvents,
      ...noRelatedEvents,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain('Some review reason');
  });

  it('should handle extraction errors gracefully', async () => {
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

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons[0]).toContain(
      'Document extraction failed for attachment att-1: Extraction failed',
    );
  });

  it('should handle non-Error exceptions', async () => {
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

    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons[0]).toContain('Unknown error');
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
      externalCreatedAt: '2024-01-01',
      metadata: { attributes: [] },
    } as unknown as DocumentEvent;

    const dropOffEvent = {
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
    });

    expect(mockExtract).toHaveBeenCalledTimes(1);
    expect(result.failMessages).toHaveLength(0);
  });
});
