import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/io-helpers';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  METHODOLOGY_DEFINITION,
  PARTICIPANT_HOMOLOGATION_GROUP,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/methodologies/bold/matchers';
import {
  eventNameIsAnyOf,
  isOpenEvent,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type Address,
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';
import { calculateDistance, isNil, pick } from '@carrot-fndn/shared/helpers';
import { isAfter, startOfToday } from 'date-fns';
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

export const getParticipantHomologationDocument = ({
  homologationDocuments,
  participantId,
}: {
  homologationDocuments: Document[];
  participantId: NonEmptyString;
}): Document | undefined =>
  homologationDocuments.find((document) => {
    const openEvent = document.externalEvents?.find(isOpenEvent);

    return !isNil(openEvent) && openEvent.participant.id === participantId;
  });

export const homologationIsNotExpired = (document: Document): boolean => {
  const closeEvent = document.externalEvents?.find(
    eventNameIsAnyOf([DocumentEventName.CLOSE]),
  );
  const homologationDueDate = getEventAttributeValue(
    closeEvent,
    DocumentEventAttributeName.HOMOLOGATION_DUE_DATE,
  );

  if (is<NonEmptyString>(homologationDueDate)) {
    const dueDate = new Date(homologationDueDate);

    return isAfter(dueDate, startOfToday());
  }

  return false;
};

interface Geolocation {
  latitude: number;
  longitude: number;
}

export const evaluateGeocodePrecision = (
  startGeocode: Geolocation,
  endGeocode: Geolocation,
): boolean => calculateDistance(startGeocode, endGeocode) <= 2;

export const compareAddresses = (
  addressA: Address,
  addressB: Address,
): boolean => {
  const keys = Object.keys(addressA).filter(
    (key) => !['latitude', 'longitude'].includes(key),
  ) as (keyof Address)[];

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
