import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  DocumentCategory,
  DocumentEventName,
  DocumentType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import { addDays, formatDate, subDays } from 'date-fns';

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

const { CLOSE } = DocumentEventName;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE, SORTING_FACTOR } =
  NewDocumentEventAttributeName;

const defaultCloseEventMetadataAttributes: MetadataAttributeParameter[] = [
  [HOMOLOGATION_DATE, formatDate(subDays(new Date(), 2), 'yyyy-MM-dd')],
  [HOMOLOGATION_DUE_DATE, formatDate(addDays(new Date(), 2), 'yyyy-MM-dd')],
  // TODO: it's temporary, we need to remove when the homologation document is defined
  [SORTING_FACTOR, faker.number.float({ max: 1, min: 0 })],
];

export const stubBoldHomologationDocumentCloseEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}) =>
  stubDocumentEventWithMetadataAttributes(
    { ...partialDocumentEvent, name: CLOSE },
    mergeMetadataAttributes(
      defaultCloseEventMetadataAttributes,
      metadataAttributes,
    ),
  );

const boldHomologationExternalEventsMap = new Map([
  [CLOSE, stubBoldHomologationDocumentCloseEvent()],
]);

export const stubBoldHomologationDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldHomologationExternalEventsMap
    : mergeEventsMaps(boldHomologationExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      },
      false,
    ),
  };
};
