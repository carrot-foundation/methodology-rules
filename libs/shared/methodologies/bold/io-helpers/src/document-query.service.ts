import type {
  BoldDocument,
  BoldDocumentEvent,
  BoldDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { type DocumentLoader } from '@carrot-fndn/shared/document/loader';
import {
  isNil,
  isNonEmptyString,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';

import type {
  ConnectionKeys,
  DocumentFetcher,
  DocumentKey,
  DocumentQueryCriteria,
  QueryContext,
  Visitor,
} from './document-query.service.types';

import { BaseDocumentQueryService } from './abstract-document-query.service';
import {
  isDocumentRelation,
  isObject,
  isRelatedDocumentCriteria,
  validateDocument,
} from './document-query.service.validators';

export class DocumentQueryService extends BaseDocumentQueryService<
  BoldDocument,
  DocumentQueryCriteria,
  QueryContext
> {
  constructor(private readonly documentLoaderService: DocumentLoader) {
    const documentFetcher: DocumentFetcher<BoldDocument> = {
      fetch: async ({ s3Key: documentKey }) => {
        const document = await this.documentLoaderService.load({
          key: documentKey,
        });

        if (isNil(document) || isNil(document.document)) {
          throw new Error(`Document not found: ${documentKey}`);
        }

        const validation = validateDocument(document.document);

        if (!validation.success) {
          throw new Error(
            `Invalid document: ${documentKey}: ${JSON.stringify(validation.error.issues)}`,
          );
        }

        return validation.data;
      },
    };

    super(documentFetcher, documentFetcher);
  }

  protected async fetchDocument(
    documentKey: DocumentKey,
  ): Promise<BoldDocument> {
    return this.documentFetcher.fetch(documentKey);
  }

  protected getConnectionKeys(
    criteria: DocumentQueryCriteria,
    document: BoldDocument,
    context: QueryContext,
  ): Array<ConnectionKeys<DocumentQueryCriteria>> {
    const { externalEvents, parentDocumentId } = document;

    const connectionKeys: Array<ConnectionKeys<DocumentQueryCriteria>> = [];

    if (
      isObject(criteria.parentDocument) &&
      isNonEmptyString(parentDocumentId)
    ) {
      const parentDocumentKey = this.getDocumentKey({
        context,
        documentId: parentDocumentId,
      });

      connectionKeys.push({
        criteria: criteria.parentDocument,
        documentKeys: [parentDocumentKey],
      });
    }

    connectionKeys.push(
      ...(criteria.relatedDocuments ?? []).flatMap((criterion) => {
        const { category, subtype, type } = criterion;
        const documentKeys: DocumentKey[] = [];

        const matcher = new DocumentMatcher({
          ...(isNonEmptyString(category) && { category }),
          ...(isNonEmptyString(subtype) && { subtype }),
          ...(isNonEmptyString(type) && { type }),
        });

        for (const event of externalEvents || []) {
          const relationship = this.getEventRelationship(event);

          if (
            isDocumentRelation(relationship) &&
            matcher.matches(relationship)
          ) {
            documentKeys.push(
              this.getDocumentKey({
                context,
                documentId: relationship.documentId,
              }),
            );
          }
        }

        return {
          criteria: criterion,
          documentKeys,
        };
      }),
    );

    return connectionKeys;
  }

  protected getDocumentKey({
    context,
    documentId,
  }: {
    context: QueryContext;
    documentId: string;
  }): DocumentKey {
    return {
      s3Key: toDocumentKey({
        documentId,
        documentKeyPrefix: context.s3KeyPrefix,
      }),
    };
  }

  protected async processFetchedDocument<T = void>({
    callback,
    context,
    criteria,
    document,
  }: {
    // eslint-disable-next-line no-shadow
    callback: (document: Visitor<BoldDocument>) => T;
    context: QueryContext;
    criteria: DocumentQueryCriteria;
    document: BoldDocument;
  }): Promise<T[]> {
    const result: T[] = [];

    if (!isRelatedDocumentCriteria(criteria)) {
      result.push(callback({ document }));
    }

    result.push(
      ...(await this.loadQueryCriteria<T>({
        callback,
        context,
        criteria,
        document,
      })),
    );

    return result;
  }

  private getEventRelationship({
    relatedDocument,
  }: BoldDocumentEvent): BoldDocumentRelation | undefined {
    if (isDocumentRelation(relatedDocument)) {
      return relatedDocument;
    }

    return undefined;
  }
}
