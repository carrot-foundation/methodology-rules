import type { tags } from 'typia';

import type {
  DocumentEventAttachment,
  DocumentEventAttribute,
} from './document-event.types';

export interface DocumentEventWithMetadata {
  metadata: {
    attributes: DocumentEventAttribute[] & tags.MinItems<1>;
  };
}

export interface DocumentEventWithAttachments {
  attachments: DocumentEventAttachment[] & tags.MinItems<1>;
}
