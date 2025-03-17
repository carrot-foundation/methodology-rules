import type {
  Document,
  DocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { PartialDeep } from 'type-fest';

import type { MetadataAttributeParameter } from './bold.builder.helpers';

export type BoldExternalEventsObject = Partial<
  Record<string, DocumentEvent | undefined>
>;

export type BoldExternalEventsMap = Map<string, DocumentEvent | undefined>;

export interface StubBoldDocumentEventParameters {
  metadataAttributes?: MetadataAttributeParameter[] | undefined;
  partialDocumentEvent?: PartialDeep<DocumentEvent> | undefined;
}

export interface StubBoldDocumentParameters {
  externalEventsMap?:
    | BoldExternalEventsMap
    | BoldExternalEventsObject
    | undefined;
  partialDocument?: PartialDeep<Document> | undefined;
}
