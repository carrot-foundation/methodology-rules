import { logger } from '@carrot-fndn/shared/helpers';

import type {
  CrossValidationConfig,
  CrossValidationInput,
  CrossValidationResult,
} from './cross-validation.types';
import type { DocumentExtractorService } from './document-extractor.service';
import type { BaseExtractedData } from './document-extractor.types';

const processInput = async <
  TEventData,
  TExtractedData extends BaseExtractedData,
>(
  input: CrossValidationInput<TEventData>,
  config: CrossValidationConfig<TEventData, TExtractedData>,
  extractor: DocumentExtractorService,
  result: CrossValidationResult,
): Promise<void> => {
  const { attachmentInfo, eventData } = input;

  try {
    const extractorConfig = config.getExtractorConfig(eventData);

    if (!extractorConfig) {
      result.reviewRequired = true;
      result.reviewReasons.push({
        code: 'UNKNOWN_DOCUMENT_TYPE',
        description: `Unknown document type, cannot perform cross-validation for attachment ${attachmentInfo.attachmentId}`,
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

    result.crossValidation['_extraction'] = {
      documentType: extractorConfig.documentType,
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
    logger.error(
      { attachmentInfo, error },
      'Failed to extract document for cross-validation',
    );
    result.failMessages.push(
      `Document extraction failed for attachment ${attachmentInfo.attachmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const crossValidateAttachments = async <
  TEventData,
  TExtractedData extends BaseExtractedData,
>(
  inputs: CrossValidationInput<TEventData>[],
  config: CrossValidationConfig<TEventData, TExtractedData>,
  extractor: DocumentExtractorService,
): Promise<CrossValidationResult> => {
  const result: CrossValidationResult = {
    crossValidation: {},
    failMessages: [],
    failReasons: [],
    reviewReasons: [],
    reviewRequired: false,
  };

  for (const input of inputs) {
    await processInput(input, config, extractor, result);
  }

  return result;
};
