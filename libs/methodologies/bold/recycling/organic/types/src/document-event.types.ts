import type {
  MethodologyDocumentEvent,
  MethodologyDocumentEventAttribute,
  MethodologyDocumentEventMetadata,
  MethodologyDocumentReference,
} from '@carrot-fndn/shared/types';

import type {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentSubtype,
  DocumentType,
} from './enum.types';

export interface DocumentEventAttribute
  extends MethodologyDocumentEventAttribute {
  name: DocumentEventAttributeName | string;
}

export interface DocumentEventMetadata
  extends MethodologyDocumentEventMetadata {
  attributes?: DocumentEventAttribute[] | undefined;
}

export interface DocumentReference extends MethodologyDocumentReference {
  category?: DocumentCategory | string | undefined;
  subtype?: DocumentSubtype | string | undefined;
  type?: DocumentType | string | undefined;
}

export interface DocumentEvent extends MethodologyDocumentEvent {
  metadata?: DocumentEventMetadata | undefined;
  referencedDocument?: DocumentReference | undefined;
  relatedDocument?: DocumentReference | undefined;
}
