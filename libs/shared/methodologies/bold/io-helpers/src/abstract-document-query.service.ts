import type { AnyObject } from '@carrot-fndn/shared/types';

import {
  boundedParallelFetchInOrder,
  DEFAULT_FETCH_CONCURRENCY,
} from '@carrot-fndn/shared/helpers';

import type {
  ConnectionKeys,
  DocumentFetcher,
  DocumentKey,
  DocumentQuery,
  Visitor,
} from './document-query.service.types';

export abstract class BaseDocumentQueryService<
  Document extends AnyObject,
  Criteria extends AnyObject,
  QueryContext extends AnyObject,
> {
  constructor(
    protected readonly rootDocumentFetcher: DocumentFetcher<Document>,
    protected readonly documentFetcher: DocumentFetcher<Document>,
  ) {}

  async load({
    context,
    criteria,
    documentId,
  }: {
    context: QueryContext;
    criteria: Criteria;
    documentId: string;
  }): Promise<DocumentQuery<Document>> {
    const document = await this.rootDocumentFetcher.fetch(
      this.getDocumentKey({
        context,
        documentId,
      }),
    );

    return {
      iterator: () => ({
        each: async (callback: (visitor: Visitor<Document>) => void) => {
          await this.loadQueryCriteria({
            callback,
            context,
            criteria,
            document,
          });
        },
        map: async <T>(callback: (visitor: Visitor<Document>) => T) =>
          this.loadQueryCriteria<T>({
            callback,
            context,
            criteria,
            document,
          }),
      }),
      rootDocument: document,
    };
  }

  protected abstract fetchDocument(documentKey: DocumentKey): Promise<Document>;

  protected abstract getConnectionKeys(
    criteria: Criteria,
    document: Document,
    context: QueryContext,
  ): Array<ConnectionKeys<Criteria>>;

  protected abstract getDocumentKey({
    context,
    documentId,
  }: {
    context: QueryContext;
    documentId: string;
  }): DocumentKey;

  protected async loadQueryCriteria<T = void>({
    callback,
    context,
    criteria,
    document,
  }: {
    callback: (visitor: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    document: Document;
  }): Promise<T[]> {
    const connections = this.getConnectionKeys(criteria, document, context);

    const results: T[] = [];

    for (const { criteria: connectionCriteria, documentKeys } of connections) {
      // Parallel within each connection, sequential across connections — preserves depth-first traversal order.
      for await (const {
        value: fetchedDocument,
      } of boundedParallelFetchInOrder(
        documentKeys,
        (documentKey: DocumentKey) => this.fetchDocument(documentKey),
        DEFAULT_FETCH_CONCURRENCY,
      )) {
        results.push(
          ...(await this.processFetchedDocument<T>({
            callback,
            context,
            criteria: connectionCriteria,
            document: fetchedDocument,
          })),
        );
      }
    }

    return results;
  }

  protected abstract processFetchedDocument<T = void>(parameters: {
    callback: (visitor: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    document: Document;
  }): Promise<T[]>;
}
