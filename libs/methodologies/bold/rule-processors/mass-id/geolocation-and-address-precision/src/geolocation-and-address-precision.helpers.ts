import { isNil, logger } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  getApprovedExceptions,
  isApprovedExceptionValid,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
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
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Geolocation,
  type Latitude,
  type Longitude,
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

import type {
  GpsLatitudeApprovedException,
  GpsLongitudeApprovedException,
} from './geolocation-and-address-precision.types';

import {
  isGpsLatitudeApprovedException,
  isGpsLongitudeApprovedException,
} from './geolocation-and-address-precision.typia';

export const hasVerificationDocument = (
  massIDAuditDocument: Document,
  participantId: string,
  actorType: MassIDDocumentActorType,
  accreditationDocuments: Document[],
): boolean => {
  const actorEvent = massIDAuditDocument.externalEvents?.find(
    (event) =>
      isActorEvent(event) &&
      eventHasLabel(event, actorType) &&
      event.participant.id === participantId,
  );

  if (isNil(actorEvent)) {
    return false;
  }

  const accreditationDocumentId = actorEvent.relatedDocument?.documentId;

  if (isNil(accreditationDocumentId)) {
    return false;
  }

  const participantAccreditationDocument = accreditationDocuments.find(
    (document) => document.id === accreditationDocumentId,
  );

  return !isNil(participantAccreditationDocument);
};

export const getAccreditedAddressByParticipantIdAndActorType = (
  massIDAuditDocument: Document,
  participantId: string,
  actorType: MassIDDocumentActorType,
  accreditationDocuments: Document[],
): MethodologyAddress | undefined => {
  const actorEvent = massIDAuditDocument.externalEvents?.find(
    (event) =>
      isActorEvent(event) &&
      eventHasLabel(event, actorType) &&
      event.participant.id === participantId,
  );

  if (isNil(actorEvent)) {
    logger.debug(
      `[MassID Audit Document ${massIDAuditDocument.id}] Actor event not found for participant ${participantId} and actor type ${actorType}`,
    );

    return undefined;
  }

  const accreditationDocumentId = actorEvent.relatedDocument?.documentId;

  if (isNil(accreditationDocumentId)) {
    logger.debug(
      `[MassID Audit Document ${massIDAuditDocument.id}] Accreditation document ID not found for actor event ${actorEvent.id}`,
    );

    return undefined;
  }

  const participantAccreditationDocument = accreditationDocuments.find(
    (document) => document.id === accreditationDocumentId,
  );

  if (isNil(participantAccreditationDocument)) {
    logger.debug(
      `[MassID Audit Document ${massIDAuditDocument.id}] Participant accreditation document not found for accreditation document ID ${accreditationDocumentId}`,
    );

    return undefined;
  }

  const facilityAddressEvent =
    participantAccreditationDocument.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.FACILITY_ADDRESS]),
    );

  if (!facilityAddressEvent) {
    logger.debug(
      `[MassID Audit Document ${massIDAuditDocument.id}] Facility address event not found for participant ${participantId} and actor type ${actorType}`,
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

export const getGpsExceptionsFromRecyclerAccreditation = (
  recyclerAccreditationDocument: Document | undefined,
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
): {
  latitudeException: GpsLatitudeApprovedException | undefined;
  longitudeException: GpsLongitudeApprovedException | undefined;
} => {
  if (isNil(recyclerAccreditationDocument)) {
    return { latitudeException: undefined, longitudeException: undefined };
  }

  const { ACCREDITATION_RESULT } = DocumentEventName;
  const approvedExceptions = getApprovedExceptions(
    recyclerAccreditationDocument,
    ACCREDITATION_RESULT,
  );

  if (!approvedExceptions) {
    return { latitudeException: undefined, longitudeException: undefined };
  }

  const latitudeException = approvedExceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === eventName.toString() &&
      exception['Attribute Name'] ===
        DocumentEventAttributeName.CAPTURED_GPS_LATITUDE.toString(),
  );

  const longitudeException = approvedExceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === eventName.toString() &&
      exception['Attribute Name'] ===
        DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE.toString(),
  );

  return {
    latitudeException: isGpsLatitudeApprovedException(latitudeException)
      ? latitudeException
      : undefined,
    longitudeException: isGpsLongitudeApprovedException(longitudeException)
      ? longitudeException
      : undefined,
  };
};

export const isGpsExceptionValid = (
  exception:
    | GpsLatitudeApprovedException
    | GpsLongitudeApprovedException
    | undefined,
): boolean => {
  const isValidException =
    isGpsLatitudeApprovedException(exception) ||
    isGpsLongitudeApprovedException(exception);

  if (!isValidException) {
    return false;
  }

  return isApprovedExceptionValid(exception);
};

export const shouldSkipGpsValidation = (
  latitudeException: GpsLatitudeApprovedException | undefined,
  longitudeException: GpsLongitudeApprovedException | undefined,
): boolean => {
  const hasValidLatitudeException = isGpsExceptionValid(latitudeException);
  const hasValidLongitudeException = isGpsExceptionValid(longitudeException);

  return hasValidLatitudeException && hasValidLongitudeException;
};
