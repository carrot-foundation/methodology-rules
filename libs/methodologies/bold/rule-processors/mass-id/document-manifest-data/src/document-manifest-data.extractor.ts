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
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import {
  type AttachmentInfo,
  type DocumentManifestEventSubject,
  getExtractorConfig,
  type MtrCrossValidationEventData,
  validateBasicExtractedData,
  validateMtrExtractedData,
} from './document-manifest-data.helpers';

const documentExtractor = createDocumentExtractor(textExtractor);

const isMtrEventData = (
  eventData: DocumentManifestEventSubject,
): eventData is MtrCrossValidationEventData => 'pickUpEvent' in eventData;

export const crossValidateWithTextract = async ({
  attachmentInfos,
  documentManifestEvents,
  dropOffEvent,
  haulerEvent,
  pickUpEvent,
  recyclerEvent,
  wasteGeneratorEvent,
}: {
  attachmentInfos: AttachmentInfo[];
  documentManifestEvents: DocumentManifestEventSubject[];
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
}): Promise<CrossValidationResult> => {
  const inputs: CrossValidationInput<DocumentManifestEventSubject>[] = [];

  for (const [index, attachmentInfo] of attachmentInfos.entries()) {
    // eslint-disable-next-line security/detect-object-injection
    const baseEvent = documentManifestEvents[index];

    if (!baseEvent) {
      continue;
    }

    const isMtr = baseEvent.documentType?.toString() === 'MTR';

    if (isMtr) {
      const mtrEventData: MtrCrossValidationEventData = {
        ...baseEvent,
        dropOffEvent,
        haulerEvent,
        pickUpEvent,
        recyclerEvent,
        wasteGeneratorEvent,
      };

      inputs.push({ attachmentInfo, eventData: mtrEventData });
    } else {
      inputs.push({ attachmentInfo, eventData: baseEvent });
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

        return validateBasicExtractedData(extractionResult, eventData);
      },
    },
    documentExtractor,
  );
};
