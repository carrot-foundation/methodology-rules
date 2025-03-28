import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type ApiDocumentCheckDuplicatesResponse,
  AuditApiService,
} from '@carrot-fndn/shared/methodologies/audit-api';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
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
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { VEHICLE_LICENSE_PLATE } = NewDocumentEventAttributeName;
const {
  ACTOR_TYPE,
  MOVE_TYPE,
  VEHICLE_LICENSE_PLATE: VEHICLE_LICENSE_PLATE_OLD,
} = DocumentEventAttributeName;
const { ACTOR, DROP_OFF, MOVE, OPEN, PICK_UP } = DocumentEventName;
const { DROP_OFF: DROP_OFF_MOVE_TYPE } = DocumentEventMoveType;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { RECYCLER: RECYCLER_ACTOR_TYPE, SOURCE } = DocumentEventActorType;

const LICENSE_PLATE_REGEX = '^IO\\*{3}1\\s*$';

export type RequiredEvents = {
  dropOffEvent: DocumentEvent;
  pickUpEvent: DocumentEvent;
  recyclerEvent: DocumentEvent;
  wasteGeneratorEvent: DocumentEvent;
};

/* istanbul ignore next */
export const createAuditApiService = (): AuditApiService =>
  new AuditApiService();

export const findRequiredEvents = (
  document: Document,
): RequiredEvents | null => {
  const pickUpEvent = document.externalEvents?.find(
    eventNameIsAnyOf([PICK_UP]),
  );
  const dropOffEvent = document.externalEvents?.find(
    eventNameIsAnyOf([DROP_OFF]),
  );
  const wasteGeneratorEvent = document.externalEvents?.find(
    and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([WASTE_GENERATOR])),
  );
  const recyclerEvent = document.externalEvents?.find(
    and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
  );

  if (
    isNil(pickUpEvent) ||
    isNil(dropOffEvent) ||
    isNil(wasteGeneratorEvent) ||
    isNil(recyclerEvent)
  ) {
    return null;
  }

  return {
    dropOffEvent,
    pickUpEvent,
    recyclerEvent,
    wasteGeneratorEvent,
  };
};

export const createNewFormatQuery = (
  document: Document,
  events: RequiredEvents,
) => {
  const { dropOffEvent, pickUpEvent, recyclerEvent, wasteGeneratorEvent } =
    events;

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
                  value: { $options: 'i', $regex: LICENSE_PLATE_REGEX },
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

export const createOldFormatQuery = (
  document: Document,
  events: RequiredEvents,
) => {
  const { dropOffEvent, pickUpEvent, recyclerEvent, wasteGeneratorEvent } =
    events;

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
                  name: VEHICLE_LICENSE_PLATE_OLD,
                  value: { $options: 'i', $regex: LICENSE_PLATE_REGEX },
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
                  value: SOURCE,
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

export const fetchSimilarMassIdDocuments = async (
  document: Document,
  apiService: AuditApiService,
): Promise<ApiDocumentCheckDuplicatesResponse[]> => {
  const events = findRequiredEvents(document);

  if (!events) {
    return [];
  }

  const newFormatQuery = createNewFormatQuery(document, events);
  const oldFormatQuery = createOldFormatQuery(document, events);

  const [newFormattedDuplicates, oldFormattedDuplicates] = await Promise.all([
    apiService.checkDuplicateDocuments(newFormatQuery),
    apiService.checkDuplicateDocuments(oldFormatQuery),
  ]);

  return [...newFormattedDuplicates, ...oldFormattedDuplicates];
};
