import {
  type DocumentEntity,
  provideDocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentReference,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import type { DocumentQueryCriteria } from './document-query.service.types';

import { DocumentQueryService } from './document-query.service';
import { stubQueryContext } from './document-query.stubs';

describe('DocumenQueryService', () => {
  const loadDocuments = new DocumentQueryService(provideDocumentLoaderService);

  afterEach(() => jest.clearAllMocks());

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

    jest
      .spyOn(provideDocumentLoaderService, 'load')
      .mockResolvedValueOnce(document as never);

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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>)
        .mockResolvedValueOnce(
          parentDocumentEntity as DocumentEntity<Document>,
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
      expect(result).toEqual([parentDocument]);
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>)
        .mockResolvedValueOnce(parentDocumentEntity as DocumentEntity<Document>)
        .mockResolvedValueOnce(
          parentDocumentOfParentDocumentEntity as DocumentEntity<Document>,
        );

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

      expect(provideDocumentLoaderService.load).toHaveBeenCalledTimes(3);
      expect(result).toEqual([parentDocument, parentDocumentOfParentDocument]);
    });

    it('should return array with parentDocument and its relatedDocuments', async () => {
      const category = stubEnumValue(DocumentCategory);
      const { attachments, ...externalEvent } = stubDocumentEvent({
        relatedDocument: { category },
      });
      const relatedDocument = stubDocument({
        ...externalEvent,
        externalCreatedAt:
          externalEvent.externalCreatedAt ?? new Date().toISOString(),
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
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
      expect(result).toEqual([parentDocument, relatedDocument]);
    });

    it('should return array with parentDocument and relatedDocuments and its parentDocuments and relatedDocuments', async () => {
      const category = stubEnumValue(DocumentCategory);
      const subtype = stubEnumValue(DocumentSubtype);
      const type = stubEnumValue(DocumentType);
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(document as DocumentEntity<Document>)
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: parentDocument,
          }) as DocumentEntity<Document>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfParentDocument,
          }) as DocumentEntity<Document>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: parentDocumentOfRelatedDocumentOfParentDocument,
          }) as DocumentEntity<Document>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfRelatedDocumentOfParentDocument,
          }) as DocumentEntity<Document>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocument,
          }) as DocumentEntity<Document>,
        )
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: relatedDocumentOfRelatedDocument,
          }) as DocumentEntity<Document>,
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
      expect(result).toEqual([
        parentDocument,
        relatedDocumentOfParentDocument,
        parentDocumentOfRelatedDocumentOfParentDocument,
        relatedDocumentOfRelatedDocumentOfParentDocument,
        relatedDocument,
        relatedDocumentOfRelatedDocument,
      ]);
    });

    it('should return array with relatedDocuments', async () => {
      const { category, subtype, type } = stubDocumentReference();
      const relatedDocument = stubDocument();
      const document = stubDocument();

      document.externalEvents = [
        stubDocumentEvent({
          referencedDocument: undefined,
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
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
      expect(result).toEqual([relatedDocument]);
    });

    it('should return referencedDocuments in the relatedDocuments array', async () => {
      const { category, subtype, type } = stubDocumentReference();
      const referencedDocument = stubDocument();
      const document = stubDocument();

      document.externalEvents = [
        stubDocumentEvent({
          referencedDocument: { category, subtype, type },
          relatedDocument: undefined,
        }),
      ];

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [{ category, subtype, type }],
      };

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(stubDocumentEntity({ document }))
        .mockResolvedValueOnce(
          stubDocumentEntity({ document: referencedDocument }),
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
      expect(result).toEqual([referencedDocument]);
    });

    it('should return empty array when relatedDocuments criteria is array empty', async () => {
      const document = stubDocument();
      const documentEntity = stubDocumentEntity({ document });

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [],
      };

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>);

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
      const document = { ...random<Document>(), externalEvents: undefined };
      const documentEntity = stubDocumentEntity({ document });

      const criteria: DocumentQueryCriteria = {
        relatedDocuments: [
          {
            category: stubEnumValue(DocumentCategory),
          },
        ],
      };

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>);

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
      const category = stubEnumValue(DocumentCategory);
      const { attachments, ...externalEvent } = stubDocumentEvent({
        relatedDocument: { category },
      });
      const relatedDocument = stubDocument({
        ...externalEvent,
        externalCreatedAt:
          externalEvent.externalCreatedAt ?? new Date().toISOString(),
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>)
        .mockResolvedValueOnce(parentDocumentEntity as DocumentEntity<Document>)
        .mockResolvedValueOnce(
          relatedDocumentEntity as DocumentEntity<Document>,
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
      expect(result).toEqual([relatedDocument]);
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

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(documentEntity as DocumentEntity<Document>);

      jest
        .spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(
          parentDocumentEntity as DocumentEntity<Document>,
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
          referencedDocument: undefined,
          relatedDocument: undefined,
        }),
      );

      expect(eventRelationship).toBeUndefined();
    });
  });
});
