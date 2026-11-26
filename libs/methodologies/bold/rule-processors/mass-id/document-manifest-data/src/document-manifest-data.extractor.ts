import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  blankFieldReviewReason,
  createDocumentExtractor,
  crossValidateAttachments,
  type CrossValidationInput,
  type CrossValidationResult,
  lowConfidenceReviewReason,
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
  type DocumentManifestEventSubject,
  getExtractorConfig,
  type ManifestAttachments,
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
  hasReadLowConfidencePlate: boolean,
): Map<string, () => ReviewReason> => {
  // MTR systems let the transport date be left blank and filled by hand at dispatch
  const accepted = new Map([
    [
      blankFieldReviewReason('transportDate').code,
      REVIEW_REASONS.TRANSPORT_DATE_BLANK,
    ],
    // Portaria MMA 280/2020 art. 7 §1 lets the plate be left blank in the MTR system
    [
      blankFieldReviewReason('vehiclePlate').code,
      REVIEW_REASONS.VEHICLE_PLATE_BLANK,
    ],
  ]);

  // A plate read with low confidence, such as two distinct plates, still needs review
  if (!hasReadLowConfidencePlate) {
    accepted.set(
      lowConfidenceReviewReason('vehiclePlate').code,
      REVIEW_REASONS.VEHICLE_PLATE_ILLEGIBLE,
    );
  }

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

const BLANK_RECEIVING_DATE_CODE = blankFieldReviewReason('receivingDate').code;

type ManifestValidationInput = ManifestAttachments & {
  dropOffEvent: BoldDocumentEvent | undefined;
  haulerEvent: BoldDocumentEvent | undefined;
  mtrEventDocumentNumbers?: string[];
  pickUpEvent: BoldDocumentEvent | undefined;
  recyclerEvent: BoldDocumentEvent | undefined;
  wasteGeneratorEvent: BoldDocumentEvent | undefined;
  weighingEvents: BoldDocumentEvent[];
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

const validateManifestAttachments = async ({
  attachmentInfos,
  documentManifestEvents,
  dropOffEvent,
  haulerEvent,
  mtrEventDocumentNumbers = [],
  pickUpEvent,
  recyclerEvent,
  wasteGeneratorEvent,
  weighingEvents,
}: ManifestValidationInput): Promise<{
  hasReadLowConfidencePlate: boolean;
  result: CrossValidationResult;
}> => {
  let hasReadLowConfidencePlate = false;
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
          const { vehiclePlate } = extractionResult.data as MtrExtractedData;

          hasReadLowConfidencePlate ||=
            vehiclePlate?.confidence === 'low' &&
            isNonEmptyString(vehiclePlate.parsed);

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

  return { hasReadLowConfidencePlate, result };
};

// A CDF that passes cross-validation against this MassID and its MTR numbers proves the receipt a blank MTR receiving date omits
const recyclingManifestProvesReceipt = async (
  input: ManifestValidationInput,
  recyclingManifests: ManifestAttachments,
): Promise<boolean> => {
  if (recyclingManifests.attachmentInfos.length === 0) {
    return false;
  }

  const { result } = await validateManifestAttachments({
    ...input,
    ...recyclingManifests,
    mtrEventDocumentNumbers: collectMtrDocumentNumbers(
      input.documentManifestEvents,
    ),
  });

  return result.failMessages.length === 0 && !result.reviewRequired;
};

export const crossValidateWithTextract = async ({
  recyclingManifests,
  ...input
}: ManifestValidationInput & {
  recyclingManifests?: ManifestAttachments | undefined;
}): Promise<CrossValidationResult> => {
  const { hasReadLowConfidencePlate, result } =
    await validateManifestAttachments(input);
  const accepted = acceptedBlankFieldObservations(
    input.pickUpEvent,
    hasReadLowConfidencePlate,
  );

  if (
    recyclingManifests &&
    result.failMessages.length === 0 &&
    result.reviewReasons.some(
      ({ code }) => code === BLANK_RECEIVING_DATE_CODE,
    ) &&
    (await recyclingManifestProvesReceipt(input, recyclingManifests))
  ) {
    accepted.set(
      BLANK_RECEIVING_DATE_CODE,
      REVIEW_REASONS.RECEIVING_DATE_BLANK,
    );
  }

  return observeAcceptedBlankFields(result, accepted);
};
