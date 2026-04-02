import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type BoldDocument,
  BoldDocumentCategory,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocument } from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const { METHODOLOGY } = BoldDocumentCategory;

export const stubBoldMethodologyDefinitionDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): BoldDocument => {
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
        type: BoldDocumentType.DEFINITION,
      },
      false,
    ),
  };
};
