import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import { calculateDistance, isNil, pick } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  METHODOLOGY_DEFINITION,
  PARTICIPANT_HOMOLOGATION_GROUP,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  type DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Latitude,
  type Longitude,
  type MethodologyAddress,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const participantHomologationCriteria = (
  subtype: DocumentSubtype,
): DocumentCriteria => ({
  parentDocument: {},
  relatedDocuments: [
    {
      ...METHODOLOGY_DEFINITION.match,
      omit: true,
      relatedDocuments: [
        {
          ...PARTICIPANT_HOMOLOGATION_GROUP.match,
          omit: true,
          relatedDocuments: [
            {
              ...PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match,
              subtype,
            },
          ],
        },
      ],
    },
  ],
});

interface Geolocation {
  latitude: number;
  longitude: number;
}

export const evaluateGeocodePrecision = (
  startGeocode: Geolocation,
  endGeocode: Geolocation,
): boolean => calculateDistance(startGeocode, endGeocode) <= 2;

export const compareAddresses = (
  addressA: MethodologyAddress,
  addressB: MethodologyAddress,
): boolean => {
  const keys = Object.keys(addressA).filter(
    (key) => !['latitude', 'longitude'].includes(key),
  ) as (keyof MethodologyAddress)[];

  for (const key of keys) {
    // eslint-disable-next-line security/detect-object-injection
    if (addressA[key] !== addressB[key]) {
      return false;
    }
  }

  return evaluateGeocodePrecision(
    pick(addressA, 'latitude', 'longitude'),
    pick(addressB, 'latitude', 'longitude'),
  );
};

export const isMetadataGeolocationValid = (event: DocumentEvent): boolean => {
  const gpsLatitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.APP_GPS_LATITUDE,
  );
  const gpsLongitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.APP_GPS_LONGITUDE,
  );

  if (isNil(gpsLatitude) && isNil(gpsLongitude)) {
    return true;
  }

  return is<Latitude>(gpsLatitude) && is<Longitude>(gpsLongitude);
};

export const mapMassDocumentAddress = (
  event: DocumentEvent,
): MethodologyAddress => {
  const gpsLatitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.APP_GPS_LATITUDE,
  );
  const gpsLongitude = getEventAttributeValue(
    event,
    DocumentEventAttributeName.APP_GPS_LONGITUDE,
  );

  return {
    ...event.address,
    latitude: (gpsLatitude ?? event.address.latitude) as Latitude,
    longitude: (gpsLongitude ?? event.address.longitude) as Longitude,
  };
};
