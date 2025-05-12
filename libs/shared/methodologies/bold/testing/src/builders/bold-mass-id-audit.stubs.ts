import type {
  Document,
  DocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { stubDocument, stubDocumentEvent } from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const resultEventName = `Result: MassID ${RuleOutputStatus.APPROVED}`;

const boldMassIdAuditExternalEventsMap: Map<string, DocumentEvent> = new Map([
  [
    resultEventName,
    stubDocumentEvent({
      name: resultEventName,
      referencedDocument: undefined,
      relatedDocument: undefined,
    }),
  ],
]);

export const stubBoldMassIdAuditDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldMassIdAuditExternalEventsMap
    : mergeEventsMaps(boldMassIdAuditExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.MASS_ID_AUDIT,
      },
      false,
    ),
  };
};
