import type { Document } from '@carrot-fndn/methodologies/bold/types';

// eslint-disable-next-line import/no-namespace
import * as documentHelpers from './document.helpers';
import { DocumentQueryService } from './document-query.service';

export const spyOnDocumentQueryServiceLoad = (
  rootDocument: Document,
  documents: Array<Document>,
) => {
  jest.spyOn(DocumentQueryService.prototype, 'load').mockResolvedValueOnce({
    iterator: () => ({
      each: (callback) =>
        Promise.resolve(
          // eslint-disable-next-line github/array-foreach, unicorn/no-array-for-each
          documents.forEach((document) => callback({ document })),
        ),
      map: (callback) =>
        Promise.resolve(documents.map((document) => callback({ document }))),
    }),
    rootDocument,
  });
};

export const spyOnLoadParentDocument = (
  result: Awaited<ReturnType<(typeof documentHelpers)['loadParentDocument']>>,
) => {
  jest
    .spyOn(documentHelpers, 'loadParentDocument')
    .mockResolvedValueOnce(result);
};
