import {
  type AttachmentInfo,
  type DocumentExtractorConfig,
  type DocumentType,
  getDefaultLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { isNil, isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';
import { getAttachmentS3Key } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttribute,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';

export type {
  AttachmentInfo,
  CrossValidationResult,
  CrossValidationValidateResult,
} from '@carrot-fndn/shared/document-extractor';

export interface DocumentManifestEventSubject {
  attachment: MethodologyDocumentEventAttachment | undefined;
  documentNumber: EventAttributeValueType;
  documentType: EventAttributeValueType;
  eventAddressId: string | undefined;
  eventValue: number | undefined;
  exemptionJustification: EventAttributeValueType;
  hasWrongLabelAttachment: boolean;
  issueDateAttribute: MethodologyDocumentEventAttribute | undefined;
  recyclerCountryCode: string | undefined;
}

export type EventAttributeValueType =
  | MethodologyDocumentEventAttributeValue
  | string
  | undefined;

export interface ValidationResult {
  failMessages: string[];
  passMessage?: string;
  reviewReasons?: import('@carrot-fndn/shared/document-extractor').ReviewReason[];
  reviewRequired?: boolean;
}

export const DOCUMENT_TYPE_MAPPING: Record<string, DocumentType> = {
  CDF: 'recyclingManifest',
  MTR: 'transportManifest',
};

export interface LayoutValidationConfig {
  readonly unsupportedFields?: readonly string[];
  readonly unsupportedValidations?: readonly string[];
}

const LAYOUT_VALIDATION_CONFIG: Record<string, LayoutValidationConfig> = {
  'cdf-custom-1': {
    unsupportedFields: ['transportManifests'],
    unsupportedValidations: ['wasteType'],
  },
};

export const getLayoutValidationConfig = (
  layoutId: string | undefined,
): LayoutValidationConfig => {
  if (!layoutId) {
    return {};
  }

  // eslint-disable-next-line security/detect-object-injection
  return LAYOUT_VALIDATION_CONFIG[layoutId] ?? {};
};

export const getAttachmentInfos = ({
  documentId,
  events,
}: {
  documentId: string;
  events: DocumentManifestEventSubject[];
}): AttachmentInfo[] => {
  const bucketName = process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

  if (!bucketName) {
    logger.warn(
      'DOCUMENT_ATTACHMENT_BUCKET_NAME environment variable is not set, skipping attachment extraction',
    );

    return [];
  }

  return events
    .map((event) => event.attachment?.attachmentId)
    .filter((attachmentId) => isNonEmptyString(attachmentId))
    .map((attachmentId) => ({
      attachmentId,
      s3Bucket: bucketName,
      s3Key: getAttachmentS3Key(documentId, attachmentId),
    }));
};

export const getExtractorConfig = (
  eventDocumentType: EventAttributeValueType,
): DocumentExtractorConfig | undefined => {
  if (isNil(eventDocumentType)) {
    return undefined;
  }

  const typeString = eventDocumentType.toString();
  // eslint-disable-next-line security/detect-object-injection
  const documentType = DOCUMENT_TYPE_MAPPING[typeString];

  if (!documentType) {
    return undefined;
  }

  return {
    documentType,
    layouts: getDefaultLayouts(documentType),
  };
};
