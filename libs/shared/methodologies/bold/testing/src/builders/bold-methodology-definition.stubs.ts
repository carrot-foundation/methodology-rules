import { isNil } from '@carrot-fndn/shared/helpers';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocument } from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

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
        category: 'Methodology',
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: 'Definition',
      },
      false,
    ),
  };
};
