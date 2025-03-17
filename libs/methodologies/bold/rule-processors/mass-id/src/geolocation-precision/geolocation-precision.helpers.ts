import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { getParticipantHomologationDocumentByParticipantId } from '@carrot-fndn/shared/methodologies/bold/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Geolocation,
  type Latitude,
  type Longitude,
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const getHomologatedAddressByParticipantId = (
  participantId: string,
  homologationDocuments: Document[],
): MethodologyAddress | undefined => {
  const participantHomologationDocument =
    getParticipantHomologationDocumentByParticipantId({
      homologationDocuments,
      participantId,
    });

  if (isNil(participantHomologationDocument)) {
    return undefined;
  }

  const openEvent = participantHomologationDocument.externalEvents?.find(
    eventNameIsAnyOf([DocumentEventName.OPEN]),
  );

  if (isNil(openEvent)) {
    return undefined;
  }

  return openEvent.address;
};

export const getEventGpsGeolocation = (
  event: DocumentEvent,
): Geolocation | undefined => {
  const gpsLatitude = getEventAttributeValue(
    event,
    NewDocumentEventAttributeName.CAPTURED_GPS_LATITUDE,
  );
  const gpsLongitude = getEventAttributeValue(
    event,
    NewDocumentEventAttributeName.CAPTURED_GPS_LONGITUDE,
  );

  if (is<Latitude>(gpsLatitude) && is<Longitude>(gpsLongitude)) {
    return {
      latitude: gpsLatitude,
      longitude: gpsLongitude,
    };
  }

  return undefined;
};

export const getAddressGeolocation = (
  address: MethodologyAddress,
): Geolocation => ({
  latitude: address.latitude,
  longitude: address.longitude,
});
