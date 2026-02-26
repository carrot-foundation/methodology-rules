import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  createDocumentExtractor,
  crossValidateAttachments,
  type CrossValidationInput,
  type CrossValidationResult,
} from '@carrot-fndn/shared/document-extractor';
// Side-effect imports: parsers self-register via registerParser() at module load
import '@carrot-fndn/shared/document-extractor-recycling-manifest';
import '@carrot-fndn/shared/document-extractor-transport-manifest';
import { logger } from '@carrot-fndn/shared/helpers';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

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

const documentExtractor = createDocumentExtractor(textExtractor);

const isMtrEventData = (
  eventData: DocumentManifestEventSubject,
): eventData is MtrCrossValidationEventData =>
  'manifestType' in eventData &&
  (eventData as { manifestType: unknown }).manifestType === 'mtr';

export const crossValidateWithTextract = async ({
  attachmentInfos,
  documentCurrentValue = 0,
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
  documentCurrentValue?: number;
  documentManifestEvents: DocumentManifestEventSubject[];
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  mtrEventDocumentNumbers?: string[];
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}): Promise<CrossValidationResult> => {
  const inputs: CrossValidationInput<DocumentManifestEventSubject>[] = [];

  const mtrDocumentNumbers = [
    ...collectMtrDocumentNumbers(documentManifestEvents),
    ...mtrEventDocumentNumbers,
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
        documentCurrentValue,
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

  return crossValidateAttachments(
    inputs,
    {
      getExtractorConfig: (event) => getExtractorConfig(event.documentType),
      validate: (extractionResult, eventData) => {
        if (isMtrEventData(eventData)) {
          return validateMtrExtractedData(extractionResult, eventData);
        }

        if (isCdfEventData(eventData)) {
          return validateCdfExtractedData(extractionResult, eventData);
        }

        // istanbul ignore next -- all events are enriched as MTR or CDF above
        return { failMessages: [] };
      },
    },
    documentExtractor,
  );
};
