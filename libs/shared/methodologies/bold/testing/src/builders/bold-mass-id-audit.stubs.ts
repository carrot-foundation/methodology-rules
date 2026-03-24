import type {
  Document,
  DocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import { mergeEventsMaps } from './bold.builder.helpers';
import { type StubBoldDocumentParameters } from './bold.stubs.types';

const { PASSED } = RuleOutputStatus;

const resultEventName = `Result: MassID ${PASSED}`;

const boldMassIDAuditExternalEventsMap: Map<string, DocumentEvent> = new Map([
  [
    resultEventName,
    stubDocumentEventWithMetadataAttributes(
      {
        name: resultEventName,
      },
      [['Evaluation Result', PASSED]],
    ),
  ],
]);

export const stubBoldMassIDAuditDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldMassIDAuditExternalEventsMap
    : mergeEventsMaps(boldMassIDAuditExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: 'Methodology',
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: 'MassID Audit',
      },
      false,
    ),
  };
};
