import { tags } from 'typia';

import type { DateTime, UnknownObject } from '../common.types';
import type { MethodologyAddress } from './methodology-address.types';
import type {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventAttributeType,
  MethodologyDocumentEventLabel,
  MethodologyDocumentEventName,
} from './methodology-enum.types';
import type {
  MethodologyAuthor,
  MethodologyParticipant,
} from './methodology-participant.types';

import { type NonEmptyString } from '../string.types';

export interface ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: NonEmptyString;
    };
    Event: NonEmptyString;
  };
  'Attribute Name': NonEmptyString;
  'Exception Type': NonEmptyString;
  Reason: NonEmptyString;
}

export type ApprovedExceptionAttributeValue = ApprovedException[];

export interface MethodologyDocumentEvent {
  address: MethodologyAddress;
  attachments?: MethodologyDocumentEventAttachment[] | undefined;
  author: MethodologyAuthor;
  deduplicationId?: string | undefined;
  documentSideEffectUpdates?: undefined | UnknownObject;
  externalCreatedAt: DateTime;
  externalId?: string | undefined;
  id: string;
  isPublic: boolean;
  label?: MethodologyDocumentEventLabel | string | undefined;
  metadata?: MethodologyDocumentEventMetadata | undefined;
  name: MethodologyDocumentEventName | string;
  participant: MethodologyParticipant;
  preserveSensitiveData?: boolean | undefined;
  propagatedFrom?: undefined | UnknownObject;
  propagateEvent?: boolean | undefined;
  referencedDocument?: MethodologyDocumentReference | undefined;
  relatedDocument?: MethodologyDocumentReference | undefined;
  target?: undefined | UnknownObject;
  updates?: undefined | UnknownObject;
  value?: (number & tags.Minimum<0>) | undefined;
}

export interface MethodologyDocumentEventAttachment {
  attachmentId: string;
  contentLength: number & tags.Minimum<0>;
  isPublic: boolean;
  label: string;
}

export interface MethodologyDocumentEventAttribute {
  format?: MethodologyDocumentEventAttributeFormat | undefined;
  isPublic: boolean;
  name: string;
  sensitive?: boolean | undefined;
  type?: MethodologyDocumentEventAttributeType | undefined;
  value: MethodologyDocumentEventAttributeValue | undefined;
  valuePrefix?: NonEmptyString | undefined;
  valueSuffix?: NonEmptyString | undefined;
}

export interface MethodologyDocumentEventAttributeReference {
  documentId: string;
  eventId?: string | undefined;
}

export type MethodologyDocumentEventAttributeValue =
  | ApprovedExceptionAttributeValue
  | boolean
  | MethodologyDocumentEventAttributeReference
  | null
  | number
  | string
  | unknown[]
  | UnknownObject;

export interface MethodologyDocumentEventMetadata {
  attributes?: MethodologyDocumentEventAttribute[] | undefined;
}

export interface MethodologyDocumentReference {
  category?: string | undefined;
  documentId: string;
  subtype?: string | undefined;
  type?: string | undefined;
}
