import {
  type DocumentEntity,
  provideDocumentLoaderService,
} from '@carrot-fndn/shared/document/loader';
import { stubDocumentEntity } from '@carrot-fndn/shared/document/loader/stubs';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type BoldDocument,
  BoldDocumentCategory,
  BoldDocumentSubtype,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import type { DocumentQueryCriteria } from './document-query.service.types';

import { DocumentQueryService } from './document-query.service';
import { stubQueryContext } from './document-query.stubs';

describe('DocumenQueryService', () => {
  const loadDocuments = new DocumentQueryService(provideDocumentLoaderService);

  afterEach(() => vi.restoreAllMocks());

  it.each([
    {
      document: undefined,
      error: 'Document not found',
      scenario: 'document is undefined',
    },
    {
      document: { document: undefined },
      error: 'Document not found',
      scenario: 'document.document is undefined',
    },
    {
      document: { document: {} },
      error: 'Invalid document',
      scenario: 'document.document is invalid',
    },
  ])('should throw error when $scenario', async ({ document, error }) => {
    const documentId = faker.string.uuid();

    vi.spyOn(provideDocumentLoaderService, 'load').mockResolvedValueOnce(
      document as never,
    );

    const context = stubQueryContext();

    await expect(() =>
      loadDocuments.load({
        context,
        criteria: {},
        documentId,
      }),
    ).rejects.toThrow(`${error}: ${context.s3KeyPrefix}/${documentId}.json`);
  });

  describe('.map', () => {
    it('should return array with parentDocument of document', async () => {
      const parentDocument = stubDocument();
      const document = stubDocument({ parentDocumentId: parentDocument.id });
      const parentDocumentEntity = stubDocumentEntity({
        document: parentDocument,
      });
      const documentEntity = stubDocumentEntity({ document });

      const criteria: DocumentQueryCriteria = {
        parentDocument: {},
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<BoldDocument>)
        .mockResolvedValueOnce(
          parentDocumentEntity as DocumentEntity<BoldDocument>,
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject([parentDocument]);
    });

    it('should return array with parentDocument and its parentDocument', async () => {
      const parentDocumentOfParentDocument = stubDocument();
      const parentDocument = stubDocument({
        parentDocumentId: parentDocumentOfParentDocument.id,
      });
      const document = stubDocument({ parentDocumentId: parentDocument.id });
      const parentDocumentOfParentDocumentEntity = stubDocumentEntity({
        document: parentDocumentOfParentDocument,
      });
      const parentDocumentEntity = stubDocumentEntity({
        document: parentDocument,
      });
      const documentEntity = stubDocumentEntity({ document });

      // Mock implementation based on document id instead of sequence
      const mockLoad = vi
        .spyOn(provideDocumentLoaderService, 'load')
        .mockImplementation(({ key }) => {
          // Extract document ID from the key format
          const regex = /\/([^/]+)\.json$/;
          const match = regex.exec(key);
          const id = match ? match[1] : null;

          if (id === document.id) {
            return Promise.resolve(
              documentEntity as DocumentEntity<BoldDocument>,
            );
          }

          if (id === parentDocument.id) {
            return Promise.resolve(
              parentDocumentEntity as DocumentEntity<BoldDocument>,
            );
          }

          if (id === parentDocumentOfParentDocument.id) {
            return Promise.resolve(
              parentDocumentOfParentDocumentEntity as DocumentEntity<BoldDocument>,
            );
          }

          // Return a value that matches the expected type
          throw new Error(`Document not found: ${key}`);
        });

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: {
          parentDocument: {
            parentDocument: {},
          },
        },
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      // Check that it was called with the right documents, regardless of order
      expect(mockLoad).toHaveBeenCalled();
      expect(result).toMatchObject([
        parentDocument,
        parentDocumentOfParentDocument,
      ]);

      // Verify each document was loaded by checking if their IDs appear in any of the keys
      const callArguments = mockLoad.mock.calls.map((call) => call[0].key);

      expect(callArguments.some((key) => key.includes(document.id))).toBe(true);
      expect(callArguments.some((key) => key.includes(parentDocument.id))).toBe(
        true,
      );
      expect(
        callArguments.some((key) =>
          key.includes(parentDocumentOfParentDocument.id),
        ),
      ).toBe(true);
    });

    it('should return array with parentDocument and its relatedDocuments', async () => {
      const category = stubEnumValue(BoldDocumentCategory);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attachments, ...externalEvent } = stubDocumentEvent({
        relatedDocument: { category },
      });
      const relatedDocument = stubDocument({
        ...externalEvent,
      });
      const parentDocument = stubDocument({ externalEvents: [externalEvent] });
      const document = stubDocument({ parentDocumentId: parentDocument.id });
      const criteria: DocumentQueryCriteria = {
        parentDocument: {
          relatedDocuments: [
            {
              category,
            },
          ],
        },
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(stubDocumentEntity({ document }))
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: parentDocument,
          }),
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocument,
          }),
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(3);
      expect(result.map((d) => d.id)).toEqual([
        parentDocument.id,
        relatedDocument.id,
      ]);
    });

    it('should return array with parentDocument and relatedDocuments and its parentDocuments and relatedDocuments', async () => {
      const category = stubEnumValue(BoldDocumentCategory);
      const subtype = stubEnumValue(BoldDocumentSubtype);
      const type = stubEnumValue(BoldDocumentType);
      const relatedDocumentOfRelatedDocumentOfParentDocument = stubDocument();
      const parentDocumentOfRelatedDocumentOfParentDocument = stubDocument();
      const relatedDocumentOfParentDocument = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            id: relatedDocumentOfRelatedDocumentOfParentDocument.id,
            relatedDocument: { subtype },
          }),
        ],
        parentDocumentId: parentDocumentOfRelatedDocumentOfParentDocument.id,
      });
      const parentDocument = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            id: relatedDocumentOfParentDocument.id,
            relatedDocument: { category },
          }),
        ],
      });

      const relatedDocumentOfRelatedDocument = stubDocument();
      const relatedDocument = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            id: relatedDocumentOfRelatedDocument.id,
            relatedDocument: { category },
          }),
        ],
      });

      const document = stubDocumentEntity({
        document: stubDocument({
          externalEvents: [
            stubDocumentEvent({
              id: relatedDocument.id,
              relatedDocument: { type },
            }),
          ],
          parentDocumentId: parentDocument.id,
        }),
      });

      const criteria: DocumentQueryCriteria = {
        parentDocument: {
          relatedDocuments: [
            {
              category,
              parentDocument: {},
              relatedDocuments: [
                {
                  subtype,
                },
              ],
            },
          ],
        },
        relatedDocuments: [
          {
            relatedDocuments: [
              {
                category,
              },
            ],
            type,
          },
        ],
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(document as DocumentEntity<BoldDocument>)
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: parentDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfParentDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: parentDocumentOfRelatedDocumentOfParentDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfRelatedDocumentOfParentDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfRelatedDocument,
          }) as DocumentEntity<BoldDocument>,
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(7);
      expect(result).toMatchObject([
        parentDocument,
        relatedDocumentOfParentDocument,
        parentDocumentOfRelatedDocumentOfParentDocument,
        relatedDocumentOfRelatedDocumentOfParentDocument,
        relatedDocument,
        relatedDocumentOfRelatedDocument,
      ]);
    });

    it('should return array with relatedDocuments', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const relatedDocument = stubDocument();
      const document = stubDocument();

      document.externalEvents = [
        stubDocumentEvent({
          relatedDocument: { category, subtype, type },
        }),
      ];

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [
          {
            category,
            subtype,
            type,
          },
        ],
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(stubDocumentEntity({ document }))
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocument,
          }),
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject([relatedDocument]);
    });

    it('should return relatedDocuments with bidirectional false in array', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const relatedDocument = stubDocument();
      const document = stubDocument();

      document.externalEvents = [
        stubDocumentEvent({
          relatedDocument: { bidirectional: false, category, subtype, type },
        }),
      ];

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [{ category, subtype, type }],
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(stubDocumentEntity({ document }))
        .mockResolvedValueOnce(
          stubDocumentEntity({ document: relatedDocument }),
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject([relatedDocument]);
    });

    it('should return empty array when relatedDocuments criteria is array empty', async () => {
      const document = stubDocument();
      const documentEntity = stubDocumentEntity({ document });

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [],
      };

      vi.spyOn(provideDocumentLoaderService, 'load').mockResolvedValueOnce(
        documentEntity as DocumentEntity<BoldDocument>,
      );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when externalEvents is undefined', async () => {
      const document = { ...stubDocument(), externalEvents: undefined };
      const documentEntity = stubDocumentEntity({ document });

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [
          {
            category: stubEnumValue(BoldDocumentCategory),
          },
        ],
      };

      vi.spyOn(provideDocumentLoaderService, 'load').mockResolvedValueOnce(
        documentEntity as DocumentEntity<BoldDocument>,
      );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should only return related documents when the parent document is omitted', async () => {
      const category = stubEnumValue(BoldDocumentCategory);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attachments, ...externalEvent } = stubDocumentEvent({
        relatedDocument: { category },
      });
      const relatedDocument = stubDocument({
        ...externalEvent,
      });
      const parentDocument = stubDocument({ externalEvents: [externalEvent] });
      const document = stubDocument({ parentDocumentId: parentDocument.id });
      const documentEntity = stubDocumentEntity({ document });
      const relatedDocumentEntity = stubDocumentEntity({
        document: relatedDocument,
      });
      const parentDocumentEntity = stubDocumentEntity({
        document: parentDocument,
      });

      const criteria: DocumentQueryCriteria = {
        parentDocument: {
          omit: true,
          relatedDocuments: [
            {
              category,
            },
          ],
        },
      };

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<BoldDocument>)
        .mockResolvedValueOnce(
          parentDocumentEntity as DocumentEntity<BoldDocument>,
        )
        .mockResolvedValueOnce(
          relatedDocumentEntity as DocumentEntity<BoldDocument>,
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria,
        documentId: document.id,
      });

      const result = await loaderDocuments
        .iterator()
        .map(({ document: documentLoad }) => documentLoad);

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(3);
      expect(result.map((d) => d.id)).toEqual([relatedDocument.id]);
    });
  });

  describe('.each', () => {
    it('should process callback in parentDocument', async () => {
      const parentDocument = stubDocument();
      const document = stubDocument({ parentDocumentId: parentDocument.id });
      const parentDocumentEntity = stubDocumentEntity({
        document: parentDocument,
      });
      const documentEntity = stubDocumentEntity({ document });

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<BoldDocument>)
        .mockResolvedValueOnce(
          parentDocumentEntity as DocumentEntity<BoldDocument>,
        );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: {
          parentDocument: {},
        },
        documentId: document.id,
      });

      let numberOfIterations = 0;

      await loaderDocuments.iterator().each(() => {
        numberOfIterations += 1;
      });

      expect(numberOfIterations).toBe(1);
    });
  });

  describe('getEventRelationship', () => {
    it('should return undefined', () => {
      const eventRelationship = loadDocuments['getEventRelationship'](
        stubDocumentEvent({
          relatedDocument: undefined,
        }),
      );

      expect(eventRelationship).toBeUndefined();
    });
  });

  describe('parallel fetch semantics', () => {
    interface Deferred<T> {
      promise: Promise<T>;
      reject: (error: unknown) => void;
      resolve: (value: T) => void;
    }

    const createDeferred = <T>(): Deferred<T> => {
      let resolve!: (value: T) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
      });

      return { promise, reject, resolve };
    };

    it('yields related documents in input order even when loader resolutions arrive out of order', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const rootDocument = stubDocument();
      const child0 = stubDocument();
      const child1 = stubDocument();
      const child2 = stubDocument();

      rootDocument.externalEvents = [
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child0.id,
            subtype,
            type,
          },
        }),
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child1.id,
            subtype,
            type,
          },
        }),
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child2.id,
            subtype,
            type,
          },
        }),
      ];

      const child0Deferred = createDeferred<DocumentEntity<BoldDocument>>();
      const child1Deferred = createDeferred<DocumentEntity<BoldDocument>>();
      const child2Deferred = createDeferred<DocumentEntity<BoldDocument>>();

      vi.spyOn(provideDocumentLoaderService, 'load').mockImplementation(
        ({ key }) => {
          if (key.includes(rootDocument.id)) {
            return Promise.resolve(
              stubDocumentEntity({
                document: rootDocument,
              }) as DocumentEntity<BoldDocument>,
            );
          }

          if (key.includes(child0.id)) {
            return child0Deferred.promise;
          }

          if (key.includes(child1.id)) {
            return child1Deferred.promise;
          }

          if (key.includes(child2.id)) {
            return child2Deferred.promise;
          }

          return Promise.reject(new Error(`Unexpected loader key: ${key}`));
        },
      );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: { relatedDocuments: [{ category, subtype, type }] },
        documentId: rootDocument.id,
      });

      const visited: string[] = [];
      const mapPromise = loaderDocuments.iterator().map(({ document }) => {
        visited.push(document.id);

        return document.id;
      });

      // Resolve in reverse order to exercise out-of-order semantics
      child2Deferred.resolve(
        stubDocumentEntity({
          document: child2,
        }) as DocumentEntity<BoldDocument>,
      );
      child1Deferred.resolve(
        stubDocumentEntity({
          document: child1,
        }) as DocumentEntity<BoldDocument>,
      );
      child0Deferred.resolve(
        stubDocumentEntity({
          document: child0,
        }) as DocumentEntity<BoldDocument>,
      );

      const result = await mapPromise;

      // Callback invocation order preserves input order
      expect(visited).toEqual([child0.id, child1.id, child2.id]);
      // Result array preserves input order
      expect(result).toEqual([child0.id, child1.id, child2.id]);
    });

    it('propagates a loader rejection through .map()', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const rootDocument = stubDocument();
      const child = stubDocument();

      rootDocument.externalEvents = [
        stubDocumentEvent({
          relatedDocument: { category, documentId: child.id, subtype, type },
        }),
      ];

      const error = new Error('S3 exploded');

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: rootDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockRejectedValueOnce(error);

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: { relatedDocuments: [{ category, subtype, type }] },
        documentId: rootDocument.id,
      });

      await expect(
        loaderDocuments.iterator().map(({ document }) => document.id),
      ).rejects.toThrow('S3 exploded');
    });
  });
});
