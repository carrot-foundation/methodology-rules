import type {
  MethodologyDocumentEventAttachment,
  NonEmptyArray,
} from '@carrot-fndn/shared/types';

import type { DocumentEventAttribute } from './document-event.types';

export interface DocumentEventWithAttachments {
  attachments: NonEmptyArray<MethodologyDocumentEventAttachment>;
}

export interface DocumentEventWithMetadata {
  metadata: {
    attributes: NonEmptyArray<DocumentEventAttribute>;
  };
}
