import { logger } from '@carrot-fndn/shared/helpers';

import type {
  AttachmentInfo,
  CrossValidationConfig,
  CrossValidationInput,
  CrossValidationResult,
} from './cross-validation.types';
import type { BaseExtractedData } from './document-extractor.types';

import {
  DOCUMENT_EXTRACTION_COMMENTS,
  type DocumentExtractionCommentKey,
} from './document-extraction.constants';
import {
  type DocumentExtractorService,
  NoMatchingLayoutError,
} from './document-extractor.service';

const recordExtractionFailure = (
  error: unknown,
  attachmentInfo: AttachmentInfo,
  result: CrossValidationResult,
): void => {
  const isLayoutNotRecognized = error instanceof NoMatchingLayoutError;

  if (!isLayoutNotRecognized) {
    logger.error(
      { attachmentInfo, error },
      'Failed to extract document for cross-validation',
    );
  }

  const code = (
    isLayoutNotRecognized ? 'LAYOUT_NOT_RECOGNIZED' : 'EXTRACTION_FAILED'
  ) satisfies DocumentExtractionCommentKey;
  // eslint-disable-next-line security/detect-object-injection
  const description = DOCUMENT_EXTRACTION_COMMENTS[code](
    attachmentInfo.attachmentId,
    error instanceof Error ? error.message : 'Unknown error',
  );

  result.failMessages.push(description);
  result.failReasons.push({ code, description });
};

const processInput = async <
  TEventData,
  TExtractedData extends BaseExtractedData,
  TCrossValidation extends object,
>(
  input: CrossValidationInput<TEventData>,
  config: CrossValidationConfig<TEventData, TExtractedData, TCrossValidation>,
  extractor: DocumentExtractorService,
  result: CrossValidationResult,
): Promise<void> => {
  const { attachmentInfo, eventData } = input;

  try {
    const extractorConfig = config.getExtractorConfig(eventData);

    if (!extractorConfig) {
      result.reviewRequired = true;
      result.reviewReasons.push({
        code: 'UNKNOWN_DOCUMENT_TYPE' satisfies DocumentExtractionCommentKey,
        description: DOCUMENT_EXTRACTION_COMMENTS.UNKNOWN_DOCUMENT_TYPE(
          attachmentInfo.attachmentId,
        ),
      });

      return;
    }

    const extractionResult = await extractor.extract<TExtractedData>(
      { s3Bucket: attachmentInfo.s3Bucket, s3Key: attachmentInfo.s3Key },
      extractorConfig,
    );

    const validationResult = config.validate(extractionResult, eventData);

    if (validationResult.crossValidation) {
      Object.assign(result.crossValidation, validationResult.crossValidation);
    }

    result.extractionMetadata[attachmentInfo.attachmentId] = {
      ...validationResult.extractionMetadata,
      documentType:
        extractorConfig.documentType ?? extractionResult.data.documentType,
      layoutId: extractionResult.layoutId ?? null,
      layouts: extractorConfig.layouts ?? null,
      s3Uri: `s3://${attachmentInfo.s3Bucket}/${attachmentInfo.s3Key}`,
    };

    if (validationResult.failMessages.length > 0) {
      result.failMessages.push(...validationResult.failMessages);
    }

    if (validationResult.failReasons) {
      result.failReasons.push(...validationResult.failReasons);
    }

    if (validationResult.passMessage) {
      result.passMessages.push(validationResult.passMessage);
    }

    if (validationResult.reviewRequired === true) {
      result.reviewRequired = true;

      if (validationResult.reviewReasons) {
        result.reviewReasons.push(...validationResult.reviewReasons);
      }
    }

    if (extractionResult.reviewRequired) {
      result.reviewRequired = true;
      result.reviewReasons.push(...extractionResult.reviewReasons);
    }
  } catch (error) {
    recordExtractionFailure(error, attachmentInfo, result);
  }
};

export const crossValidateAttachments = async <
  TEventData,
  TExtractedData extends BaseExtractedData,
  TCrossValidation extends object = Record<string, unknown>,
>(
  inputs: CrossValidationInput<TEventData>[],
  config: CrossValidationConfig<TEventData, TExtractedData, TCrossValidation>,
  extractor: DocumentExtractorService,
): Promise<CrossValidationResult> => {
  const result: CrossValidationResult = {
    crossValidation: {},
    extractionMetadata: {},
    failMessages: [],
    failReasons: [],
    passMessages: [],
    reviewReasons: [],
    reviewRequired: false,
  };

  for (const input of inputs) {
    await processInput(input, config, extractor, result);
  }

  return result;
};
