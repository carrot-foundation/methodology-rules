import type { AnyObject } from '@carrot-fndn/shared/types';

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
        // eslint-disable-next-line no-shadow
        each: async (callback: (document: Visitor<Document>) => void) => {
          await this.loadQueryCriteria({
            callback,
            context,
            criteria,
            document,
          });
        },
        // eslint-disable-next-line no-shadow
        map: async <T>(callback: (document: Visitor<Document>) => T) =>
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

  protected abstract loadDocument<T = void>({
    callback,
    context,
    criteria,
    documentKey,
  }: {
    callback: (document: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    documentKey: DocumentKey;
  }): Promise<T[]>;

  protected async loadQueryCriteria<T = void>({
    callback,
    context,
    criteria,
    document,
  }: {
    // eslint-disable-next-line no-shadow
    callback: (document: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    document: Document;
  }): Promise<T[]> {
    const result: T[] = [];

    const connections = this.getConnectionKeys(criteria, document, context);

    for (const { criteria: connectionCriteria, documentKeys } of connections) {
      for (const documentKey of documentKeys) {
        result.push(
          ...(await this.loadDocument({
            callback,
            context,
            criteria: connectionCriteria,
            documentKey,
          })),
        );
      }
    }

    return result;
  }
}
