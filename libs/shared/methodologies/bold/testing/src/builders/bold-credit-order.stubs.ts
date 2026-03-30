import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  attachExplicitAttributes,
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
  [CREDIT_UNIT_PRICE, faker.number.float({ min: 0.01 })],
];

export const stubBoldCreditOrderCreditsEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): BoldDocumentEvent =>
  attachExplicitAttributes(
    stubDocumentEventWithMetadataAttributes(
      {
        ...partialDocumentEvent,
        name: CREDITS_EVENT_NAME,
      },
      mergeMetadataAttributes(
        defaultRulesMetadataAttributes,
        metadataAttributes,
      ),
    ),
    metadataAttributes,
  );

const boldCreditOrderExternalEventsMap = new Map([
  [CREDITS_EVENT_NAME, stubBoldCreditOrderCreditsEvent()],
]);

export const stubBoldCreditOrderDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): BoldDocument => {
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
