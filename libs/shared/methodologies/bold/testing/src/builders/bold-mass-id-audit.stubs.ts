import type {
  Document,
  DocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const { EVALUATION_RESULT } = DocumentEventAttributeName;
const { PASSED } = RuleOutputStatus;

const resultEventName = `Result: MassID ${PASSED}`;

const boldMassIdAuditExternalEventsMap: Map<string, DocumentEvent> = new Map([
  [
    resultEventName,
    stubDocumentEventWithMetadataAttributes(
      {
        name: resultEventName,
      },
      [[EVALUATION_RESULT, PASSED]],
    ),
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
