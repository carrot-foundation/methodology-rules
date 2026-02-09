import { logger } from '@carrot-fndn/shared/helpers';

import type {
  CrossValidationConfig,
  CrossValidationInput,
  CrossValidationResult,
} from './cross-validation.types';
import type { DocumentExtractorService } from './document-extractor.service';
import type { BaseExtractedData } from './document-extractor.types';

export const crossValidateAttachments = async <
  TEventData,
  TExtractedData extends BaseExtractedData,
>(
  inputs: CrossValidationInput<TEventData>[],
  config: CrossValidationConfig<TEventData, TExtractedData>,
  extractor: DocumentExtractorService,
): Promise<CrossValidationResult> => {
  const result: CrossValidationResult = {
    failMessages: [],
    reviewReasons: [],
    reviewRequired: false,
  };

  if (inputs.length === 0) {
    return result;
  }

  for (const input of inputs) {
    const { attachmentInfo, eventData } = input;

    try {
      const extractorConfig = config.getExtractorConfig(eventData);

      if (!extractorConfig) {
        result.reviewRequired = true;
        result.reviewReasons.push(
          `Unknown document type, cannot perform cross-validation for attachment ${attachmentInfo.attachmentId}`,
        );
        continue;
      }

      const extractionResult = await extractor.extract<TExtractedData>(
        { s3Bucket: attachmentInfo.s3Bucket, s3Key: attachmentInfo.s3Key },
        extractorConfig,
      );

      const validationResult = config.validate(extractionResult, eventData);

      if (validationResult.failMessages.length > 0) {
        result.failMessages.push(...validationResult.failMessages);
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
      result.reviewRequired = true;
      result.reviewReasons.push(
        `Document extraction failed for attachment ${attachmentInfo.attachmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return result;
};
