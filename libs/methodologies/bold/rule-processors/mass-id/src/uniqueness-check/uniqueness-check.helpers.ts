import {
  type ApiDocumentCheckDuplicatesResponse,
  AuditApiService,
} from '@carrot-fndn/shared/methodologies/audit-api';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventLabel,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

const { VEHICLE_LICENSE_PLATE } = NewDocumentEventAttributeName;
const {
  ACTOR_TYPE,
  MOVE_TYPE,
  VEHICLE_LICENSE_PLATE: OLD_VEHICLE_LICENSE_PLATE,
} = DocumentEventAttributeName;
const { ACTOR, DROP_OFF, MOVE, OPEN, PICK_UP } = DocumentEventName;
const { DROP_OFF: DROP_OFF_MOVE_TYPE } = DocumentEventMoveType;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { RECYCLER: RECYCLER_ACTOR_TYPE, SOURCE: SOURCE_ACTOR_TYPE } =
  DocumentEventActorType;

export type EventsData = {
  dropOffEvent: DocumentEvent;
  pickUpEvent: DocumentEvent;
  recyclerEvent: DocumentEvent;
  vehicleLicensePlate: NonEmptyString;
  wasteGeneratorEvent: DocumentEvent;
};

export const createLicensePlateRegex = (
  licensePlate: NonEmptyString,
): string => {
  const escapedValue = licensePlate
    .replaceAll(/\s+/g, '')
    .replaceAll(/[$()*+./?[\\\]^{|}-]/g, '\\$&');

  return `^${escapedValue}$`;
};

/* istanbul ignore next */
export const createAuditApiService = (): AuditApiService =>
  new AuditApiService();

export const mapMassIdV2Query = (
  document: Document,
  requiredData: EventsData,
) => {
  const {
    dropOffEvent,
    pickUpEvent,
    recyclerEvent,
    vehicleLicensePlate,
    wasteGeneratorEvent,
  } = requiredData;

  const licensePlateRegex = createLicensePlateRegex(vehicleLicensePlate);

  return {
    match: {
      $and: [
        {
          externalEvents: {
            $elementMatch: {
              'address.id': pickUpEvent.address.id,
              externalCreatedAt: pickUpEvent.externalCreatedAt,
              'metadata.attributes': {
                $elemMatch: {
                  name: VEHICLE_LICENSE_PLATE,
                  value: { $options: 'i', $regex: licensePlateRegex },
                },
              },
              name: PICK_UP,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              'address.id': dropOffEvent.address.id,
              externalCreatedAt: dropOffEvent.externalCreatedAt,
              name: DROP_OFF,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              label: WASTE_GENERATOR,
              name: ACTOR,
              'participant.id': wasteGeneratorEvent.participant.id,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              label: RECYCLER,
              name: ACTOR,
              'participant.id': recyclerEvent.participant.id,
            },
          },
        },
      ],
      category: document.category,
      currentValue: document.currentValue,
      dataSetName: document.dataSetName,
      subtype: document.subtype,
      type: document.type,
    },
  };
};

export const mapMassIdV1Query = (document: Document, events: EventsData) => {
  const {
    dropOffEvent,
    pickUpEvent,
    recyclerEvent,
    vehicleLicensePlate,
    wasteGeneratorEvent,
  } = events;

  const licensePlateRegex = createLicensePlateRegex(vehicleLicensePlate);

  return {
    match: {
      $and: [
        {
          externalEvents: {
            $elementMatch: {
              'address.id': pickUpEvent.address.id,
              externalCreatedAt: pickUpEvent.externalCreatedAt,
              'metadata.attributes': {
                $elemMatch: {
                  name: OLD_VEHICLE_LICENSE_PLATE,
                  value: { $options: 'i', $regex: licensePlateRegex },
                },
              },
              name: OPEN,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              'address.id': dropOffEvent.address.id,
              externalCreatedAt: dropOffEvent.externalCreatedAt,
              'metadata.attributes': {
                $elemMatch: {
                  name: MOVE_TYPE,
                  value: DROP_OFF_MOVE_TYPE,
                },
              },
              name: MOVE,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              'metadata.attributes': {
                $elemMatch: {
                  name: ACTOR_TYPE,
                  value: SOURCE_ACTOR_TYPE,
                },
              },
              name: ACTOR,
              'participant.id': wasteGeneratorEvent.participant.id,
            },
          },
        },
        {
          externalEvents: {
            $elementMatch: {
              'metadata.attributes': {
                $elemMatch: {
                  name: ACTOR_TYPE,
                  value: RECYCLER_ACTOR_TYPE,
                },
              },
              name: ACTOR,
              'participant.id': recyclerEvent.participant.id,
            },
          },
        },
      ],
      category: DocumentCategory.MASS,
      currentValue: document.currentValue,
      dataSetName: document.dataSetName,
      subtype: document.subtype,
      type: document.type,
    },
  };
};

export const fetchSimilarMassIdDocuments = async ({
  auditApiService,
  document,
  eventsData,
}: {
  auditApiService: AuditApiService;
  document: Document;
  eventsData: EventsData;
}): Promise<ApiDocumentCheckDuplicatesResponse[]> => {
  const newFormatQuery = mapMassIdV2Query(document, eventsData);
  const oldFormatQuery = mapMassIdV1Query(document, eventsData);

  const [newFormattedDuplicates, oldFormattedDuplicates] = await Promise.all([
    auditApiService.checkDuplicateDocuments(newFormatQuery),
    auditApiService.checkDuplicateDocuments(oldFormatQuery),
  ]);

  return [...newFormattedDuplicates, ...oldFormattedDuplicates];
};
