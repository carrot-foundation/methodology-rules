import { tags } from 'typia';

import type { UnknownObject } from '../common.types';
import type { MethodologyAddress } from './methodology-address.types';
import type { MethodologyDocumentEvent } from './methodology-document-event.types';
import type { MethodologyParticipant } from './methodology-participant.types';

import { DataSetName } from './methodology-enum.types';

export interface MethodologyDocumentAttachment {
  contentLength: number & tags.Minimum<0>;
  fileName: string;
  id: string;
}

// TODO: Think about to abstract these generics from the codebase
export interface MethodologyDocument {
  attachments?: MethodologyDocumentAttachment[] | undefined;
  category: string;
  createdAt: string & tags.Format<'date-time'>;
  currentValue: number & tags.Minimum<0> & tags.Type<'float'>;
  dataSetName: DataSetName;
  externalCreatedAt: string & tags.Format<'date-time'>;
  externalEvents?: MethodologyDocumentEvent[] | undefined;
  externalId?: string | undefined;
  id: string;
  initialValue: number & tags.Minimum<0> & tags.Type<'float'>;
  isPublic?: boolean | undefined;
  isPubliclySearchable: boolean;
  measurementUnit: string;
  parentDocumentId?: string | undefined;
  permissions?: Array<UnknownObject> | undefined;
  primaryAddress: MethodologyAddress;
  primaryParticipant: MethodologyParticipant;
  status: string;
  subtype?: string | undefined;
  type?: string | undefined;
  updatedAt: string & tags.Format<'date-time'>;
}
