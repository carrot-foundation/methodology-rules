import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { DocumentQueryService } from './document-query.service';
import * as documentHelpers from './document.helpers';

export const spyOnDocumentQueryServiceLoad = (
  rootDocument: Document,
  documents: Document[],
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

export const spyOnLoadDocument = (
  result: Awaited<ReturnType<(typeof documentHelpers)['loadDocument']>>,
) => {
  jest.spyOn(documentHelpers, 'loadDocument').mockResolvedValueOnce(result);
};
