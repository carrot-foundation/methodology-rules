import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

export interface ConnectionKeys<Criteria> {
  criteria: Criteria;
  documentKeys: DocumentKey[];
}
export interface DocumentCriteria {
  parentDocument?: RelatedDocumentCriteria | undefined;
  relatedDocuments?: RelatedDocumentCriteria[] | undefined;
}

export interface DocumentFetcher<DocumentType> {
  fetch: (documentKey: DocumentKey) => Promise<DocumentType>;
}

export interface DocumentIterator<DocumentType> {
  each: (callback: (document: Visitor<DocumentType>) => void) => Promise<void>;
  map: <T>(callback: (document: Visitor<DocumentType>) => T) => Promise<T[]>;
}

export interface DocumentKey {
  s3Key: string;
}

export interface DocumentQuery<DocumentType> {
  iterator: () => DocumentIterator<DocumentType>;
  rootDocument: DocumentType;
}

export type DocumentQueryCriteria = DocumentCriteria;

export interface QueryContext {
  s3KeyPrefix: string;
}

export interface RelatedDocumentCriteria extends DocumentCriteria {
  category?: Document['category'] | undefined;
  omit?: boolean | undefined;
  subtype?: Document['subtype'];
  type?: Document['type'];
}

export interface Visitor<DocumentType> {
  document: DocumentType;
}
