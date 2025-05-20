import type { NonZeroPositive } from '@carrot-fndn/shared/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  mergeEventsMaps,
  mergeMetadataAttributes,
  type MetadataAttributeParameter,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { CREDIT_UNIT_PRICE } = DocumentEventAttributeName;

export const CREDITS_EVENT_NAME = 'Credits';

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [CREDIT_UNIT_PRICE, random<NonZeroPositive>()],
];

export const stubBoldCreditOrderCreditsEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: CREDITS_EVENT_NAME,
    },
    mergeMetadataAttributes(defaultRulesMetadataAttributes, metadataAttributes),
  );

const boldCreditOrderExternalEventsMap = new Map([
  [CREDITS_EVENT_NAME, stubBoldCreditOrderCreditsEvent()],
]);

export const stubBoldCreditOrderDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldCreditOrderExternalEventsMap
    : mergeEventsMaps(boldCreditOrderExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.CREDIT_ORDER,
      },
      false,
    ),
  };
};
