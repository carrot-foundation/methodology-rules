import type { MethodologyDocumentEventAttachment } from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

import type { DocumentEventAttribute } from './document-event.types';

export interface DocumentEventWithAttachments {
  attachments: MethodologyDocumentEventAttachment[] & tags.MinItems<1>;
}

export interface DocumentEventWithMetadata {
  metadata: {
    attributes: DocumentEventAttribute[] & tags.MinItems<1>;
  };
}
