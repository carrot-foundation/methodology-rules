import type {
  ApprovedException,
  BoldAttributeValue,
  DocumentEventAttachment,
  DocumentEventAttribute,
} from '@carrot-fndn/shared/types';

import {
  type AttachmentInfo,
  type BoldDocumentType,
  type DocumentExtractorConfig,
  getDefaultLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { getDocumentAttachmentBucketName } from '@carrot-fndn/shared/env';
import { isNil, isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';
import { isApprovedExceptionValid } from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { getAttachmentS3Key } from '@carrot-fndn/shared/methodologies/bold/utils';

export type {
  AttachmentInfo,
  CrossValidationResult,
  CrossValidationValidateResult,
} from '@carrot-fndn/shared/document-extractor';

export interface DocumentManifestEventSubject {
  approvedExceptions?: ApprovedException[];
  attachment: DocumentEventAttachment | undefined;
  documentNumber: EventAttributeValueType;
  documentType: EventAttributeValueType;
  eventAddressId: string | undefined;
  eventValue: number | undefined;
  exemptionJustification: EventAttributeValueType;
  hasWrongLabelAttachment: boolean;
  issueDateAttribute: DocumentEventAttribute | undefined;
  recyclerCountryCode: string | undefined;
}

export type EventAttributeValueType = BoldAttributeValue | string | undefined;

export interface ValidationResult {
  failMessages: string[];
  passMessage?: string;
  reviewReasons?: import('@carrot-fndn/shared/document-extractor').ReviewReason[];
  reviewRequired?: boolean;
}

export const DOCUMENT_TYPE_MAPPING: Record<string, BoldDocumentType> = {
  CDF: 'recyclingManifest',
  MTR: 'transportManifest',
};

export interface LayoutValidationConfig {
  readonly unsupportedValidations?: readonly ValidationKey[];
}

export type ValidationKey = 'mtrNumbers' | 'wasteQuantityWeight' | 'wasteType';

const LAYOUT_VALIDATION_CONFIG: Record<string, LayoutValidationConfig> = {
  'cdf-custom-1': {
    unsupportedValidations: ['mtrNumbers', 'wasteType'],
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
  const bucketName = getDocumentAttachmentBucketName();

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

export const hasRecyclingManifestException = (
  exceptions: ApprovedException[] | undefined,
  attributeName: BoldAttributeName,
  exceptionType: BoldApprovedExceptionType,
): boolean =>
  exceptions?.some(
    (exception) =>
      exception['Attribute Location'].Asset.Category ===
        BoldDocumentCategory.MASS_ID &&
      exception['Attribute Location'].Event ===
        BoldDocumentEventName.RECYCLING_MANIFEST &&
      exception['Attribute Name'] === attributeName &&
      exception['Exception Type'] === exceptionType &&
      isApprovedExceptionValid(exception),
  ) === true;
