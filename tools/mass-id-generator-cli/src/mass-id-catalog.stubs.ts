import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { EventPayload } from './mass-id-catalog.types';

import { MASS_ID_CATALOG } from './mass-id-catalog';
import { toActorPayload, toEventPayload } from './mass-id-catalog.projections';

const COUNTRY_CODE = 'BR';
const MEASUREMENT_UNIT = 'kg';

const toLoadedAddress = ({
  addressId,
  participantId,
}: Pick<EventPayload, 'addressId' | 'participantId'>) => ({
  countryCode: COUNTRY_CODE,
  id: addressId,
  participantId,
});

const toLoadedEvent = ({
  addressId,
  participantId,
  ...eventFields
}: EventPayload): BoldDocumentEvent =>
  stubDocumentEvent({
    ...eventFields,
    address: toLoadedAddress({ addressId, participantId }),
    attachments: undefined,
    participant: { id: participantId },
    relatedDocument: undefined,
  });

export const stubCatalogMassIDDocument = (): BoldDocument => {
  const { actors, document, events } = MASS_ID_CATALOG;
  const sortingEvent = events.find(
    ({ name }) => name === BoldDocumentEventName.SORTING,
  );

  if (sortingEvent?.value === undefined) {
    throw new Error('Catalog has no Sorting event value');
  }

  return stubDocument(
    {
      category: document.category,
      currentValue: sortingEvent.value,
      externalCreatedAt: document.externalCreatedAt,
      externalEvents: [
        ...actors.map((actor) => toActorPayload(actor)),
        ...events.map((event) => toEventPayload(event)),
      ].map((payload) => toLoadedEvent(payload)),
      isPublic: document.isPublic,
      isPubliclySearchable: document.isPubliclySearchable,
      measurementUnit: MEASUREMENT_UNIT,
      primaryAddress: toLoadedAddress(document),
      primaryParticipant: { id: document.participantId },
      subtype: document.subtype,
      type: document.type,
    },
    false,
  );
};
