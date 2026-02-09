import type { ScaleTicketExtractedData } from '@carrot-fndn/shared/document-extractor-scale-ticket';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';
import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

import {
  createDocumentExtractor,
  type DocumentExtractorService,
} from '@carrot-fndn/shared/document-extractor';
import '@carrot-fndn/shared/document-extractor-scale-ticket';
import { isNonEmptyArray, logger } from '@carrot-fndn/shared/helpers';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import type {
  ScaleTicketVerificationContext,
  ScaleTicketVerificationResult,
} from './scale-ticket-verification.types';

import {
  INVALID_RESULT_COMMENTS,
  NET_WEIGHT_CALCULATION_TOLERANCE,
} from '../weighing.constants';

const documentExtractor: DocumentExtractorService =
  createDocumentExtractor(textExtractor);

export const isScaleTicketVerificationConfig = (
  config: MethodologyAdditionalVerification,
): boolean => config.verificationType === 'scaleTicket';

export const verifyScaleTicketNetWeight = async ({
  config,
  expectedNetWeight,
  textExtractorInput,
}: {
  config: MethodologyAdditionalVerification;
  expectedNetWeight: number;
  textExtractorInput: TextExtractionInput | undefined;
}): Promise<ScaleTicketVerificationResult> => {
  if (!isScaleTicketVerificationConfig(config)) {
    return { errors: [] };
  }

  if (!textExtractorInput) {
    return {
      errors: [INVALID_RESULT_COMMENTS.SCALE_TICKET_MISSING_SOURCE],
    };
  }

  const layoutIds = config.layoutIds;

  if (!isNonEmptyArray(layoutIds)) {
    return {
      errors: [
        INVALID_RESULT_COMMENTS.SCALE_TICKET_UNSUPPORTED_LAYOUT('undefined'),
      ],
    };
  }

  try {
    const extractionOutput =
      await documentExtractor.extract<ScaleTicketExtractedData>(
        textExtractorInput,
        { documentType: 'scaleTicket', layouts: layoutIds },
      );

    const ticketNetWeight = extractionOutput.data.netWeight.parsed.value;
    const diff = Math.abs(ticketNetWeight - expectedNetWeight);

    if (diff > NET_WEIGHT_CALCULATION_TOLERANCE) {
      return {
        errors: [
          INVALID_RESULT_COMMENTS.SCALE_TICKET_NET_WEIGHT_MISMATCH({
            expectedNetWeight,
            ticketNetWeight,
          }),
        ],
      };
    }

    return { errors: [] };
  } catch (error) {
    logger.error(
      {
        err: error,
        expectedNetWeight,
      },
      'Scale ticket verification failed',
    );

    return {
      errors: [INVALID_RESULT_COMMENTS.SCALE_TICKET_EXTRACTION_FAILED],
    };
  }
};

export const buildScaleTicketVerificationContext = ({
  config,
  expectedNetWeight,
}: {
  config: MethodologyAdditionalVerification | undefined;
  expectedNetWeight: number | undefined;
}): ScaleTicketVerificationContext => ({
  config,
  expectedNetWeight,
});
