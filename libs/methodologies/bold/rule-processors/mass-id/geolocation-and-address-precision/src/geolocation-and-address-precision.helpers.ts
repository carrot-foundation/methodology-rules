import { isNil, logger } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  eventHasLabel,
  eventNameIsAnyOf,
  isActorEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Geolocation,
  type Latitude,
  type Longitude,
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const getAccreditedAddressByParticipantIdAndActorType = (
  massIdAuditDocument: Document,
  participantId: string,
  actorType: MassIdDocumentActorType,
  accreditationDocuments: Document[],
): MethodologyAddress | undefined => {
  const actorEvent = massIdAuditDocument.externalEvents?.find(
    (event) =>
      isActorEvent(event) &&
      eventHasLabel(event, actorType) &&
      event.participant.id === participantId,
  );

  if (isNil(actorEvent)) {
    logger.debug(
      `[MassID Audit Document ${massIdAuditDocument.id}] Actor event not found for participant ${participantId} and actor type ${actorType}`,
    );

    return undefined;
  }

  const accreditationDocumentId = actorEvent.relatedDocument?.documentId;

  if (isNil(accreditationDocumentId)) {
    logger.debug(
      `[MassID Audit Document ${massIdAuditDocument.id}] Accreditation document ID not found for actor event ${actorEvent.id}`,
    );

    return undefined;
  }

  const participantAccreditationDocument = accreditationDocuments.find(
    (document) => document.id === accreditationDocumentId,
  );

  if (isNil(participantAccreditationDocument)) {
    logger.debug(
      `[MassID Audit Document ${massIdAuditDocument.id}] Participant accreditation document not found for accreditation document ID ${accreditationDocumentId}`,
    );

    return undefined;
  }

  const facilityAddressEvent =
    participantAccreditationDocument.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.FACILITY_ADDRESS]),
    );

  if (!facilityAddressEvent) {
    logger.debug(
      `[MassID Audit Document ${massIdAuditDocument.id}] Facility address event not found for participant ${participantId} and actor type ${actorType}`,
    );

    return undefined;
  }

  return facilityAddressEvent.address;
};

export const getEventGpsGeolocation = (
  event: DocumentEvent,
): Geolocation | undefined => {
  const gpsLatitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.CAPTURED_GPS_LATITUDE,
  );
  const gpsLongitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE,
  );

  if (is<Latitude>(gpsLatitude) && is<Longitude>(gpsLongitude)) {
    return {
      latitude: gpsLatitude,
      longitude: gpsLongitude,
    };
  }

  return undefined;
};
