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
    aId: event.author.participantId,
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
    ...(event.metadata && {
      meta: event.metadata as { [key: string]: unknown },
    }),
    name: event.name,
    pId: event.participant.id,
    ...(event.value !== undefined && { value: event.value }),
  };
}

function optimizeParticipants(
  primaryParticipant: Document['primaryParticipant'],
  events?: DocumentEvent[],
): Record<NonEmptyString, OptimizedParticipant> {
  const participants: Record<NonEmptyString, OptimizedParticipant> = {};

  participants[primaryParticipant.id as NonEmptyString] = {
    country: primaryParticipant.countryCode as NonEmptyString,
    name: primaryParticipant.name as NonEmptyString,
    taxId: primaryParticipant.piiSnapshotId as NonEmptyString,
    type: primaryParticipant.type as NonEmptyString,
  };

  if (events) {
    for (const event of events) {
      const { participant } = event;

      participants[participant.id as NonEmptyString] = {
        country: participant.countryCode as NonEmptyString,
        name: participant.name as NonEmptyString,
        taxId: participant.piiSnapshotId as NonEmptyString,
        type: participant.type as NonEmptyString,
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

  return {
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
  };
}
