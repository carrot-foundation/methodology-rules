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
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { LatitudeSchema, LongitudeSchema } from '@carrot-fndn/shared/types';

import type {
  GpsLatitudeApprovedException,
  GpsLongitudeApprovedException,
} from './geolocation-and-address-precision.types';

import {
  isGpsLatitudeApprovedException,
  isGpsLongitudeApprovedException,
} from './geolocation-and-address-precision.validators';

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
      eventNameIsAnyOf([DocumentEventName['Facility Address']]),
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
    DocumentEventAttributeName['Captured GPS Latitude'],
  );
  const gpsLongitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName['Captured GPS Longitude'],
  );

  if (
    LatitudeSchema.safeParse(gpsLatitude).success &&
    LongitudeSchema.safeParse(gpsLongitude).success
  ) {
    return {
      latitude: gpsLatitude as number,
      longitude: gpsLongitude as number,
    };
  }

  return undefined;
};

export const getGpsExceptionsFromRecyclerAccreditation = (
  recyclerAccreditationDocument: Document | undefined,
  eventName: 'Drop-off' | 'Pick-up',
): {
  latitudeException: GpsLatitudeApprovedException | undefined;
  longitudeException: GpsLongitudeApprovedException | undefined;
} => {
  if (isNil(recyclerAccreditationDocument)) {
    return { latitudeException: undefined, longitudeException: undefined };
  }

  const approvedExceptions = getApprovedExceptions(
    recyclerAccreditationDocument,
    DocumentEventName['Accreditation Result'],
  );

  if (!approvedExceptions) {
    return { latitudeException: undefined, longitudeException: undefined };
  }

  const latitudeException = approvedExceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === eventName.toString() &&
      exception['Attribute Name'] ===
        DocumentEventAttributeName['Captured GPS Latitude'].toString(),
  );

  const longitudeException = approvedExceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === eventName.toString() &&
      exception['Attribute Name'] ===
        DocumentEventAttributeName['Captured GPS Longitude'].toString(),
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
