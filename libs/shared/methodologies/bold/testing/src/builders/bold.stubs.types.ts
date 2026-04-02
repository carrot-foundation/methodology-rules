import type {
  BoldDocument,
  BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { PartialDeep } from 'type-fest';

import type { MetadataAttributeParameter } from './bold.builder.helpers';

export type BoldExternalEventsMap = Map<string, BoldDocumentEvent | undefined>;

export type BoldExternalEventsObject = Partial<
  Record<string, BoldDocumentEvent | undefined>
>;

export interface StubBoldDocumentEventParameters {
  metadataAttributes?: MetadataAttributeParameter[] | undefined;
  partialDocumentEvent?: PartialDeep<BoldDocumentEvent> | undefined;
}

export interface StubBoldDocumentParameters {
  externalEventsMap?:
    | BoldExternalEventsMap
    | BoldExternalEventsObject
    | undefined;
  partialDocument?: PartialDeep<BoldDocument> | undefined;
}
