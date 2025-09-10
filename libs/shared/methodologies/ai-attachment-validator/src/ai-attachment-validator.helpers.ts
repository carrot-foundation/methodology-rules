import {
  type Document,
  DocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  OptimizedAddress,
  OptimizedDocumentEvent,
  OptimizedDocumentJson,
  OptimizedParticipant,
} from './ai-attachment-validator.api.dto';
import { assertOptimizedDocumentJson } from './ai-attachment-validator.typia';

function optimizeAddresses(
  primaryAddress: Document['primaryAddress'],
  events?: DocumentEvent[],
): Record<NonEmptyString, OptimizedAddress> {
  const addresses: Record<NonEmptyString, OptimizedAddress> = {};

  addresses[primaryAddress.id] = {
    city: primaryAddress.city,
    country: primaryAddress.countryCode,
    lat: primaryAddress.latitude,
    lng: primaryAddress.longitude,
    num: primaryAddress.number,
    state: primaryAddress.countryState,
    street: primaryAddress.street,
    zip: primaryAddress.zipCode,
  };

  if (events) {
    for (const event of events) {
      const { address } = event;

      addresses[address.id] = {
        city: address.city,
        country: address.countryCode,
        lat: address.latitude,
        lng: address.longitude,
        num: address.number,
        state: address.countryState,
        street: address.street,
        zip: address.zipCode,
      };
    }
  }

  return addresses;
}

function optimizeExternalEvent(event: DocumentEvent): OptimizedDocumentEvent {
  return {
    addressId: event.author.participantId,
    ...(event.attachments?.[0] && {
      attachment: {
        file: event.attachments[0].attachmentId,
        size: event.attachments[0].contentLength,
      },
    }),
    externalCreatedAt: event.externalCreatedAt,
    ...(event.externalId && {
      externalId: event.externalId,
    }),
    id: event.id,
    ...(event.label && { label: event.label }),
    ...(event.metadata?.attributes && {
      // eslint-disable-next-line unicorn/no-array-reduce
      meta: event.metadata.attributes.reduce<{ [key: string]: unknown }>(
        (accumulator, attribute) => {
          accumulator[attribute.name] = attribute.value;

          return accumulator;
        },
        {},
      ),
    }),
    name: event.name,
    participantId: event.participant.id,
    ...(event.value !== undefined && { value: event.value }),
  };
}

function optimizeParticipants(
  primaryParticipant: Document['primaryParticipant'],
  events?: DocumentEvent[],
): Record<NonEmptyString, OptimizedParticipant> {
  const participants: Record<NonEmptyString, OptimizedParticipant> = {};

  participants[primaryParticipant.id] = {
    country: primaryParticipant.countryCode,
    name: primaryParticipant.name,
    taxId: primaryParticipant.piiSnapshotId,
    type: primaryParticipant.type,
  };

  if (events) {
    for (const event of events) {
      const { participant } = event;

      participants[participant.id] = {
        country: participant.countryCode,
        name: participant.name,
        taxId: participant.piiSnapshotId,
        type: participant.type,
      };
    }
  }

  return participants;
}

export const formatInvalidField = (
  fieldName: NonEmptyString,
  reason: NonEmptyString | null,
): string =>
  reason && reason.trim().length > 0 ? `${fieldName}: ${reason}` : fieldName;

export function optimizeDocumentJsonForValidation(
  documentJson: Document,
): OptimizedDocumentJson {
  const {
    category,
    currentValue,
    externalCreatedAt,
    externalId,
    id,
    measurementUnit,
    status,
    subtype,
    type,
  } = documentJson;

  const addresses = optimizeAddresses(
    documentJson.primaryAddress,
    documentJson.externalEvents,
  );

  const participants = optimizeParticipants(
    documentJson.primaryParticipant,
    documentJson.externalEvents,
  );

  const events = documentJson.externalEvents?.map((externalEvent) =>
    optimizeExternalEvent(externalEvent),
  );

  return assertOptimizedDocumentJson({
    addresses,
    category,
    currentValue,
    events,
    externalCreatedAt,
    externalId,
    id,
    measurementUnit,
    participants,
    status,
    subtype,
    type,
  });
}
