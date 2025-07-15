import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { getParticipantAccreditationDocumentByParticipantId } from '@carrot-fndn/shared/methodologies/bold/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Geolocation,
  type Latitude,
  type Longitude,
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const getAccreditatedAddressByParticipantId = (
  participantId: string,
  accreditationDocuments: Document[],
): MethodologyAddress | undefined => {
  const participantAccreditationDocument =
    getParticipantAccreditationDocumentByParticipantId({
      accreditationDocuments,
      participantId,
    });

  if (isNil(participantAccreditationDocument)) {
    return undefined;
  }

  const facilityAddressEvent =
    participantAccreditationDocument.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.FACILITY_ADDRESS]),
    );

  return facilityAddressEvent?.address;
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
