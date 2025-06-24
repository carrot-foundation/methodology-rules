import type {
  MethodologyDocumentEvent,
  MethodologyDocumentEventAttribute,
  MethodologyDocumentEventMetadata,
  MethodologyDocumentRelation,
} from '@carrot-fndn/shared/types';

import type {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
  DocumentType,
} from './enum.types';

export interface DocumentEvent extends MethodologyDocumentEvent {
  metadata?: DocumentEventMetadata | undefined;
  name: DocumentEventName | string;
  relatedDocument?: DocumentRelation | undefined;
}

export interface DocumentEventAttribute
  extends MethodologyDocumentEventAttribute {
  name: DocumentEventAttributeName | string;
}

export interface DocumentEventMetadata
  extends MethodologyDocumentEventMetadata {
  attributes?: DocumentEventAttribute[] | undefined;
}

export interface DocumentRelation extends MethodologyDocumentRelation {
  bidirectional?: boolean | undefined;
  category?: DocumentCategory | string | undefined;
  subtype?: DocumentSubtype | string | undefined;
  type?: DocumentType | string | undefined;
}
