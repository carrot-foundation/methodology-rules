import {
  type ApiDocumentCheckDuplicatesResponse,
  AuditApiService,
} from '@carrot-fndn/shared/methodologies/audit-api';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyDocumentEventLabel,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;
const { ACTOR, DROP_OFF, MOVE, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;

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
    const escapedChar = char.replaceAll(
      /[$()*+./?[\\\]^{|}-]/g,
      String.raw`\$&`,
    );

    escapedPattern += `${escapedChar}[-\\s]*`;
  }

  return `^${escapedPattern.slice(0, -6)}$`;
};

/* istanbul ignore next */
export const createAuditApiService = (): AuditApiService =>
  new AuditApiService();

export const mapMassIDV2Query = (
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

export const mapMassIDV1Query = (document: Document, events: EventsData) => {
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
                  name: 'vehicle-license-plate',
                  value: { $options: 'i', $regex: licensePlateRegex },
                },
              },
              name: 'OPEN',
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
                  name: 'move-type',
                  value: 'Drop-off',
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
                  name: 'actor-type',
                  value: 'SOURCE',
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
                  name: 'actor-type',
                  value: 'RECYCLER',
                },
              },
              name: ACTOR,
              'participant.id': recyclerEvent.participant.id,
            },
          },
        },
      ],
      category: 'Mass',
      currentValue: document.currentValue,
      dataSetName: document.dataSetName,
      subtype: document.subtype,
      type: document.type,
    },
  };
};

export const fetchSimilarMassIDDocuments = async ({
  auditApiService,
  document,
  eventsData,
}: {
  auditApiService: AuditApiService;
  document: Document;
  eventsData: EventsData;
}): Promise<ApiDocumentCheckDuplicatesResponse[]> => {
  const v2FormatQuery = mapMassIDV2Query(document, eventsData);
  const v1FormatQuery = mapMassIDV1Query(document, eventsData);

  const [v2FormattedDuplicates, v1FormattedDuplicates] = await Promise.all([
    auditApiService.checkDuplicateDocuments(v2FormatQuery),
    auditApiService.checkDuplicateDocuments(v1FormatQuery),
  ]);

  return [...v2FormattedDuplicates, ...v1FormattedDuplicates];
};
