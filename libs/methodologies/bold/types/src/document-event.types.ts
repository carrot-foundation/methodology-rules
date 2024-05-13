import { type UnknownObject } from '@carrot-fndn/shared/types';
import { tags } from 'typia';

import type { Address } from './address.types';
import type { Document } from './document.types';
import type {
  DocumentEventAttributeName,
  DocumentEventName,
} from './enum.types';
import type { Author, Participant } from './participant.types';

export type DocumentEventAttributeValue =
  | UnknownObject
  | boolean
  | null
  | number
  | string
  | unknown[];

export interface DocumentEventAttribute {
  isPublic: boolean;
  name: DocumentEventAttributeName | string;
  value: DocumentEventAttributeValue;
}

export interface DocumentEventMetadata {
  attributes?: Array<DocumentEventAttribute> | undefined;
}

export interface DocumentEventAttachment {
  attachmentId: string;
  contentLength: number & tags.Minimum<0>;
  isPublic: boolean;
  label: string;
}

export interface DocumentReference {
  category?: Document['category'] | undefined;
  documentId: string;
  subtype?: Document['subtype'];
  type?: Document['type'];
}

export interface DocumentEvent {
  address: Address;
  attachments?: DocumentEventAttachment[] | undefined;
  author: Author;
  documentSideEffectUpdates?: UnknownObject | undefined;
  externalCreatedAt?: (string & tags.Format<'date-time'>) | undefined;
  externalId?: string | undefined;
  id: string;
  isPublic: boolean;
  metadata?: DocumentEventMetadata | undefined;
  name: DocumentEventName | string;
  participant: Participant;
  preserveSensitiveData?: boolean | undefined;
  propagateEvent?: boolean | undefined;
  propagatedFrom?: UnknownObject | undefined;
  referencedDocument?: DocumentReference | undefined;
  relatedDocument?: DocumentReference | undefined;
  target?: UnknownObject | undefined;
  updates?: UnknownObject | undefined;
  value?: (number & tags.Minimum<0>) | undefined;
}
