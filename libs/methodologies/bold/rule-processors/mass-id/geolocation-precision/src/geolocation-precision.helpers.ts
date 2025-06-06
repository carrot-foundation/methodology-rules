import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { getParticipantHomologationDocumentByParticipantId } from '@carrot-fndn/shared/methodologies/bold/helpers';
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

  const homologationContextEvent =
    participantHomologationDocument.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.HOMOLOGATION_CONTEXT]),
    );

  return homologationContextEvent?.address;
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
