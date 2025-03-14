import { tags } from 'typia';

import type { UnknownObject } from '../common.types';
import type { MethodologyAddress } from './methodology-address.types';
import type {
  MethodologyDocumentEventLabel,
  MethodologyDocumentEventName,
} from './methodology-enum.types';
import type {
  MethodologyAuthor,
  MethodologyParticipant,
} from './methodology-participant.types';

export type MethodologyDocumentEventAttributeValue =
  | UnknownObject
  | boolean
  | null
  | number
  | string
  | unknown[];

export interface MethodologyDocumentEventAttribute {
  isPublic: boolean;
  name: string;
  value: MethodologyDocumentEventAttributeValue;
}

export interface MethodologyDocumentEventMetadata {
  attributes?: Array<MethodologyDocumentEventAttribute> | undefined;
}

export interface MethodologyDocumentEventAttachment {
  attachmentId: string;
  contentLength: number & tags.Minimum<0>;
  isPublic: boolean;
  label: string;
}

export interface MethodologyDocumentReference {
  category?: string | undefined;
  documentId: string;
  subtype?: string | undefined;
  type?: string | undefined;
}

export interface MethodologyDocumentEvent {
  address: MethodologyAddress;
  attachments?: MethodologyDocumentEventAttachment[] | undefined;
  author: MethodologyAuthor;
  documentSideEffectUpdates?: UnknownObject | undefined;
  externalCreatedAt?: (string & tags.Format<'date-time'>) | undefined;
  externalId?: string | undefined;
  id: string;
  isPublic: boolean;
  label?: MethodologyDocumentEventLabel | string | undefined;
  metadata?: MethodologyDocumentEventMetadata | undefined;
  name: MethodologyDocumentEventName | string;
  participant: MethodologyParticipant;
  preserveSensitiveData?: boolean | undefined;
  propagateEvent?: boolean | undefined;
  propagatedFrom?: UnknownObject | undefined;
  referencedDocument?: MethodologyDocumentReference | undefined;
  relatedDocument?: MethodologyDocumentReference | undefined;
  target?: UnknownObject | undefined;
  updates?: UnknownObject | undefined;
  value?: (number & tags.Minimum<0>) | undefined;
}
