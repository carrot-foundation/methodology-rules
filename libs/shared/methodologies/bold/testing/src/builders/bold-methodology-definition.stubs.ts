import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocument } from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const { METHODOLOGY } = DocumentCategory;

export const stubBoldMethodologyDefinitionDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? new Map()
    : mergeEventsMaps(new Map(), externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.DEFINITION,
      },
      false,
    ),
  };
};
