import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

export interface ConnectionKeys<Criteria> {
  criteria: Criteria;
  documentKeys: DocumentKey[];
}
export interface DocumentCriteria {
  parentDocument?: RelatedDocumentCriteria | undefined;
  relatedDocuments?: RelatedDocumentCriteria[] | undefined;
}

export interface DocumentFetcher<BoldDocumentType> {
  fetch: (documentKey: DocumentKey) => Promise<BoldDocumentType>;
}

export interface DocumentIterator<BoldDocumentType> {
  each: (
    callback: (document: Visitor<BoldDocumentType>) => void,
  ) => Promise<void>;
  map: <T>(
    callback: (document: Visitor<BoldDocumentType>) => T,
  ) => Promise<T[]>;
}

export interface DocumentKey {
  s3Key: string;
}

export interface DocumentQuery<BoldDocumentType> {
  iterator: () => DocumentIterator<BoldDocumentType>;
  rootDocument: BoldDocumentType;
}

export type DocumentQueryCriteria = DocumentCriteria;

export interface QueryContext {
  s3KeyPrefix: string;
}

export interface RelatedDocumentCriteria extends DocumentCriteria {
  category?: BoldDocument['category'] | undefined;
  omit?: boolean | undefined;
  subtype?: BoldDocument['subtype'];
  type?: BoldDocument['type'];
}

export interface Visitor<BoldDocumentType> {
  document: BoldDocumentType;
}
