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
  const normalizedValue = licensePlate
    .replaceAll(/\s+/g, '')
    .replaceAll('-', '');

  let escapedPattern = '';

  for (const char of normalizedValue) {
    const escapedChar = char.replaceAll(/[$()*+./?[\\\]^{|}-]/g, '\\$&');

    escapedPattern += `${escapedChar}[-\\s]*`;
  }

  return `^${escapedPattern.slice(0, -6)}$`;
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
            $elemMatch: {
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
            $elemMatch: {
              'address.id': dropOffEvent.address.id,
              externalCreatedAt: dropOffEvent.externalCreatedAt,
              name: DROP_OFF,
            },
          },
        },
        {
          externalEvents: {
            $elemMatch: {
              label: WASTE_GENERATOR,
              name: ACTOR,
              'participant.id': wasteGeneratorEvent.participant.id,
            },
          },
        },
        {
          externalEvents: {
            $elemMatch: {
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
            $elemMatch: {
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
            $elemMatch: {
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
            $elemMatch: {
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
            $elemMatch: {
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
  const v2FormatQuery = mapMassIdV2Query(document, eventsData);
  const v1FormatQuery = mapMassIdV1Query(document, eventsData);

  const [v2FormattedDuplicates, v1FormattedDuplicates] = await Promise.all([
    auditApiService.checkDuplicateDocuments(v2FormatQuery),
    auditApiService.checkDuplicateDocuments(v1FormatQuery),
  ]);

  return [...v2FormattedDuplicates, ...v1FormattedDuplicates];
};
