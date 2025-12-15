import type { ScaleTicketParser } from '@carrot-fndn/shared/scale-ticket-extractor';
import type {
  TextExtractionInput,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

import { logger } from '@carrot-fndn/shared/helpers';
import { Layout1ScaleTicketParser } from '@carrot-fndn/shared/scale-ticket-extractor';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import type {
  ScaleTicketLayout,
  ScaleTicketVerificationConfig,
  ScaleTicketVerificationContext,
  ScaleTicketVerificationResult,
} from './scale-ticket-verification.types';

import {
  INVALID_RESULT_COMMENTS,
  NET_WEIGHT_CALCULATION_TOLERANCE,
} from '../weighing.constants';

const layoutParsers: Record<ScaleTicketLayout, ScaleTicketParser> = {
  layout1: new Layout1ScaleTicketParser(),
};

const getParser = (layout: ScaleTicketLayout): ScaleTicketParser | undefined =>
  layoutParsers[layout];

export const isScaleTicketVerificationConfig = (
  config: MethodologyAdditionalVerification,
): config is ScaleTicketVerificationConfig => {
  // Cast to a looser shape so the check remains meaningful even as more
  // verification types are added in the future.
  const { verificationType } = config as { verificationType?: string };

  return verificationType === 'scaleTicket';
};

const extractScaleTicketData = (
  layout: ScaleTicketLayout,
  extractionResult: TextExtractionResult,
) => {
  const parser = getParser(layout);

  if (!parser) {
    throw new Error(
      INVALID_RESULT_COMMENTS.SCALE_TICKET_UNSUPPORTED_LAYOUT(layout),
    );
  }

  return parser.parse(extractionResult);
};

export const verifyScaleTicketNetWeight = async ({
  config,
  expectedNetWeight,
  textExtractorInput,
}: {
  config: MethodologyAdditionalVerification | undefined;
  expectedNetWeight: number | undefined;
  textExtractorInput: TextExtractionInput | undefined;
}): Promise<ScaleTicketVerificationResult> => {
  if (!config || !isScaleTicketVerificationConfig(config)) {
    return { errors: [] };
  }

  if (expectedNetWeight === undefined || expectedNetWeight === 0) {
    return { errors: [] };
  }

  if (!textExtractorInput) {
    return {
      errors: [INVALID_RESULT_COMMENTS.SCALE_TICKET_MISSING_SOURCE],
    };
  }

  try {
    const extractionResult =
      await textExtractor.extractText(textExtractorInput);
    const scaleTicketData = extractScaleTicketData(
      config.scaleTicketLayout,
      extractionResult,
    );

    const diff = Math.abs(scaleTicketData.netWeight.value - expectedNetWeight);

    if (diff > NET_WEIGHT_CALCULATION_TOLERANCE) {
      return {
        errors: [
          INVALID_RESULT_COMMENTS.SCALE_TICKET_NET_WEIGHT_MISMATCH({
            expectedNetWeight,
            ticketNetWeight: scaleTicketData.netWeight.value,
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
  config: ScaleTicketVerificationConfig | undefined;
  expectedNetWeight: number | undefined;
}): ScaleTicketVerificationContext => ({
  config,
  expectedNetWeight,
});
