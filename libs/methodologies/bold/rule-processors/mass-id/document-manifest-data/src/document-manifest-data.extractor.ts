import {
  blankFieldReviewReason,
  createDocumentExtractor,
  crossValidateAttachments,
  type CrossValidationInput,
  type CrossValidationResult,
  type ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import { isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
// Side-effect imports: parsers self-register via registerParser() at module load
import '@carrot-fndn/shared/document-extractor-recycling-manifest';
import '@carrot-fndn/shared/document-extractor-transport-manifest';
import {
  BoldAttributeName,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  pdfTextLayerExtractor,
  textExtractor,
} from '@carrot-fndn/shared/text-extractor';

import { REVIEW_REASONS } from './document-manifest-data.constants';
import {
  type AttachmentInfo,
  type DocumentManifestEventSubject,
  getExtractorConfig,
} from './document-manifest-data.helpers';
import {
  type CdfCrossValidationEventData,
  collectMtrDocumentNumbers,
  isCdfEventData,
  validateCdfExtractedData,
} from './recycling-manifest-cross-validation.helpers';
import {
  type MtrCrossValidationEventData,
  validateMtrExtractedData,
} from './transport-manifest-cross-validation.helpers';

const documentExtractor = createDocumentExtractor(
  textExtractor,
  pdfTextLayerExtractor,
);

const { DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION } = BoldAttributeName;

const acceptedBlankFieldObservations = (
  pickUpEvent: BoldDocumentEvent | undefined,
): Map<string, () => ReviewReason> => {
  // MTR systems let the transport date be left blank and filled by hand at dispatch
  const accepted = new Map([
    [
      blankFieldReviewReason('transportDate').code,
      REVIEW_REASONS.TRANSPORT_DATE_BLANK,
    ],
  ]);

  if (
    isNonEmptyString(
      getEventAttributeValue(
        pickUpEvent,
        DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
      ),
    )
  ) {
    accepted.set(
      blankFieldReviewReason('driverName').code,
      REVIEW_REASONS.DRIVER_NAME_BLANK,
    );
  }

  return accepted;
};

const observeAcceptedBlankFields = (
  result: CrossValidationResult,
  accepted: Map<string, () => ReviewReason>,
): CrossValidationResult => {
  const observations = result.reviewReasons.flatMap(({ code }) => {
    const observation = accepted.get(code);

    return observation ? [observation()] : [];
  });

  if (observations.length === 0) {
    return result;
  }

  const reviewReasons = result.reviewReasons.filter(
    ({ code }) => !accepted.has(code),
  );

  return {
    ...result,
    observations: [...result.observations, ...observations],
    reviewReasons,
    reviewRequired: reviewReasons.length > 0,
  };
};

const isMtrEventData = (
  eventData: DocumentManifestEventSubject,
): eventData is MtrCrossValidationEventData =>
  'manifestType' in eventData &&
  (eventData as { manifestType: unknown }).manifestType === 'mtr';

export const crossValidateWithTextract = async ({
  attachmentInfos,
  documentManifestEvents,
  dropOffEvent,
  haulerEvent,
  mtrEventDocumentNumbers = [],
  pickUpEvent,
  recyclerEvent,
  wasteGeneratorEvent,
  weighingEvents,
}: {
  attachmentInfos: AttachmentInfo[];
  documentManifestEvents: DocumentManifestEventSubject[];
  dropOffEvent: BoldDocumentEvent | undefined;
  haulerEvent: BoldDocumentEvent | undefined;
  mtrEventDocumentNumbers?: string[];
  pickUpEvent: BoldDocumentEvent | undefined;
  recyclerEvent: BoldDocumentEvent | undefined;
  wasteGeneratorEvent: BoldDocumentEvent | undefined;
  weighingEvents: BoldDocumentEvent[];
}): Promise<CrossValidationResult> => {
  const inputs: CrossValidationInput<DocumentManifestEventSubject>[] = [];

  const mtrDocumentNumbers = [
    ...new Set([
      ...collectMtrDocumentNumbers(documentManifestEvents),
      ...mtrEventDocumentNumbers,
    ]),
  ];

  for (const attachmentInfo of attachmentInfos) {
    const baseEvent = documentManifestEvents.find(
      (event) => event.attachment?.attachmentId === attachmentInfo.attachmentId,
    );

    if (!baseEvent) {
      logger.warn(
        { attachmentId: attachmentInfo.attachmentId },
        'No matching document manifest event found for attachment, skipping cross-validation',
      );
      continue;
    }

    const isMtr = baseEvent.documentType?.toString() === 'MTR';

    if (isMtr) {
      const mtrEventData: MtrCrossValidationEventData = {
        ...baseEvent,
        dropOffEvent,
        haulerEvent,
        manifestType: 'mtr',
        pickUpEvent,
        recyclerEvent,
        wasteGeneratorEvent,
        weighingEvents,
      };

      inputs.push({ attachmentInfo, eventData: mtrEventData });
    } else {
      const cdfEventData: CdfCrossValidationEventData = {
        ...baseEvent,
        dropOffEvent,
        manifestType: 'cdf',
        mtrDocumentNumbers,
        pickUpEvent,
        recyclerEvent,
        wasteGeneratorEvent,
        weighingEvents,
      };

      inputs.push({ attachmentInfo, eventData: cdfEventData });
    }
  }

  const result = await crossValidateAttachments(
    inputs,
    {
      getExtractorConfig: (event) => getExtractorConfig(event.documentType),
      validate: (extractionResult, eventData) => {
        if (isMtrEventData(eventData)) {
          return validateMtrExtractedData(extractionResult, eventData);
        }

        /* v8 ignore start -- all events are enriched as MTR or CDF above */
        if (isCdfEventData(eventData)) {
          return validateCdfExtractedData(extractionResult, eventData);
        }

        return { failMessages: [] };
        /* v8 ignore stop */
      },
    },
    documentExtractor,
  );

  return observeAcceptedBlankFields(
    result,
    acceptedBlankFieldObservations(pickUpEvent),
  );
};
