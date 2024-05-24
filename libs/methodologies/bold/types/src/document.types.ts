import type { UnknownObject } from '@carrot-fndn/shared/types';

import { tags } from 'typia';

import type { Address } from './address.types';
import type { DocumentEvent } from './document-event.types';
import type {
  DataSetName,
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from './enum.types';
import type { Participant } from './participant.types';

export interface DocumentAttachment {
  contentLength: number & tags.Minimum<0>;
  fileName: string;
  id: string;
}

export interface Document {
  attachments?: DocumentAttachment[] | undefined;
  category: DocumentCategory | string;
  createdAt: string & tags.Format<'date-time'>;
  currentValue: number & tags.Minimum<0> & tags.Type<'float'>;
  dataSetName: DataSetName;
  externalCreatedAt: string & tags.Format<'date-time'>;
  externalEvents?: DocumentEvent[] | undefined;
  externalId?: string | undefined;
  id: string;
  initialValue: number & tags.Minimum<0> & tags.Type<'float'>;
  isPublic?: boolean | undefined;
  isPubliclySearchable: boolean;
  measurementUnit: string;
  parentDocumentId?: string | undefined;
  permissions?: Array<UnknownObject> | undefined;
  primaryAddress: Address;
  primaryParticipant: Participant;
  status: string;
  subtype?: DocumentSubtype | string | undefined;
  type?: DocumentType | string | undefined;
  updatedAt: string & tags.Format<'date-time'>;
}
