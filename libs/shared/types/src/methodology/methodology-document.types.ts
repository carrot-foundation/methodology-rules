import type { tags } from 'typia';

import type { DateTime, UnknownObject } from '../common.types';
import type { MethodologyAddress } from './methodology-address.types';
import type { MethodologyDocumentEvent } from './methodology-document-event.types';
import type { MethodologyParticipant } from './methodology-participant.types';

import {
  DataSetName,
  MethodologyDocumentStatus,
} from './methodology-enum.types';

// TODO: Think about to abstract these generics from the codebase
export interface MethodologyDocument {
  attachments?: MethodologyDocumentAttachment[] | undefined;
  category: string;
  createdAt: DateTime;
  currentValue: number & tags.Minimum<0> & tags.Type<'float'>;
  dataSetName: DataSetName;
  deduplicationId?: string | undefined;
  externalCreatedAt: DateTime;
  externalEvents?: MethodologyDocumentEvent[] | undefined;
  externalId?: string | undefined;
  id: string;
  isPublic?: boolean | undefined;
  isPubliclySearchable: boolean;
  measurementUnit: string;
  parentDocumentId?: string | undefined;
  permissions?: undefined | UnknownObject[];
  primaryAddress: MethodologyAddress;
  primaryParticipant: MethodologyParticipant;
  status: MethodologyDocumentStatus | string;
  subtype?: string | undefined;
  tags?: Record<string, null | string | undefined> | undefined;
  type?: string | undefined;
  updatedAt: DateTime;
}

export interface MethodologyDocumentAttachment {
  contentLength: number & tags.Minimum<0>;
  fileName: string;
  id: string;
}
