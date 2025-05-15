import type { NonZeroPositive } from '@carrot-fndn/shared/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  type MetadataAttributeParameter,
  mergeEventsMaps,
  mergeMetadataAttributes,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { RULES_METADATA } = DocumentEventName;
const { UNIT_PRICE } = DocumentEventAttributeName;

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [UNIT_PRICE, random<NonZeroPositive>()],
];

export const stubBoldCreditOrderRulesMetadataEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RULES_METADATA,
    },
    mergeMetadataAttributes(defaultRulesMetadataAttributes, metadataAttributes),
  );

const boldCreditOrderExternalEventsMap = new Map([
  [RULES_METADATA, stubBoldCreditOrderRulesMetadataEvent()],
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
