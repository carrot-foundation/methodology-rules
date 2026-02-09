import {
  createDocumentExtractor,
  crossValidateAttachments,
  type CrossValidationInput,
  type CrossValidationResult,
} from '@carrot-fndn/shared/document-extractor';
import { textExtractor } from '@carrot-fndn/shared/text-extractor';

import {
  type AttachmentInfo,
  type DocumentManifestEventSubject,
  getExtractorConfig,
  validateExtractedDataAgainstEvent,
} from './document-manifest-data.helpers';

const documentExtractor = createDocumentExtractor(textExtractor);

export const crossValidateWithTextract = async ({
  attachmentInfos,
  documentManifestEvents,
}: {
  attachmentInfos: AttachmentInfo[];
  documentManifestEvents: DocumentManifestEventSubject[];
}): Promise<CrossValidationResult> => {
  const inputs: CrossValidationInput<DocumentManifestEventSubject>[] =
    attachmentInfos
      .map((attachmentInfo, index) => ({
        attachmentInfo,
        // eslint-disable-next-line security/detect-object-injection
        eventData: documentManifestEvents[index],
      }))
      .filter(
        (input): input is CrossValidationInput<DocumentManifestEventSubject> =>
          input.eventData !== undefined,
      );

  return crossValidateAttachments(
    inputs,
    {
      getExtractorConfig: (event) => getExtractorConfig(event.documentType),
      validate: validateExtractedDataAgainstEvent,
    },
    documentExtractor,
  );
};
