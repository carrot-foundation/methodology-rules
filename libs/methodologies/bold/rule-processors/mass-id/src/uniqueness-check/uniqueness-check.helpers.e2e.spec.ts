import { seedDocument } from '@carrot-fndn/shared/document/seeds';
import { AuditApiService } from '@carrot-fndn/shared/methodologies/audit-api';
import {
  BoldStubsBuilder,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type LicensePlate,
  type MethodologyDocument,
  MethodologyDocumentEventLabel,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { random } from 'typia';

import {
  type EventsData,
  fetchSimilarMassIdDocuments,
} from './uniqueness-check.helpers';

const { ACTOR } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { DROP_OFF, MOVE, PICK_UP } = DocumentEventName;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

describe('Uniqueness Check Helpers E2E', () => {
  let auditApiService: AuditApiService;
  let v2DocumentId: NonEmptyString;
  let v2DocumentStub: MethodologyDocument;

  const vehicleLicensePlate = random<LicensePlate>();
  const eventsData: EventsData = {
    dropOffEvent: stubBoldMassIdDropOffEvent(),
    pickUpEvent: stubBoldMassIdPickUpEvent({
      metadataAttributes: [
        {
          name: VEHICLE_LICENSE_PLATE,
          value: vehicleLicensePlate,
        },
      ],
    }),
    recyclerEvent: stubDocumentEvent({
      label: RECYCLER,
      name: ACTOR,
    }),
    vehicleLicensePlate,
    wasteGeneratorEvent: stubDocumentEvent({
      label: WASTE_GENERATOR,
      name: ACTOR,
    }),
  };

  beforeAll(async () => {
    auditApiService = new AuditApiService();

    const { massIdDocument } = new BoldStubsBuilder()
      .createMassIdDocument({
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: eventsData.recyclerEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: eventsData.wasteGeneratorEvent,
          [DROP_OFF]: eventsData.dropOffEvent,
          [PICK_UP]: eventsData.pickUpEvent,
        },
      })
      .build();

    v2DocumentStub = massIdDocument;

    v2DocumentId = await seedDocument({
      partialDocument: v2DocumentStub,
    });
  });

  describe('fetchSimilarMassIdDocuments', () => {
    it('should return an empty array when no similar documents are found', async () => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      const result = await fetchSimilarMassIdDocuments({
        auditApiService,
        document: massIdDocument,
        eventsData: {
          dropOffEvent: stubBoldMassIdDropOffEvent(),
          pickUpEvent: stubBoldMassIdPickUpEvent(),
          recyclerEvent: stubDocumentEvent({
            label: RECYCLER,
            name: ACTOR,
          }),
          vehicleLicensePlate: random<LicensePlate>(),
          wasteGeneratorEvent: stubDocumentEvent({
            label: WASTE_GENERATOR,
            name: ACTOR,
          }),
        },
      });

      expect(result).toEqual([]);
    });

    it('should return a list of similar documents when similar documents are found', async () => {
      const duplicatedDocumentId = await seedDocument({
        partialDocument: v2DocumentStub,
      });

      const result = await fetchSimilarMassIdDocuments({
        auditApiService,
        document: v2DocumentStub,
        eventsData,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: duplicatedDocumentId,
            status: expect.any(String),
          }),
          expect.objectContaining({
            id: v2DocumentId,
            status: expect.any(String),
          }),
        ]),
      );
    });

    it('should return a list of similar documents when a v1 document is similar to a v2 document', async () => {
      const v1DocumentStub = stubDocument({
        category: 'Mass',
        currentValue: v2DocumentStub.currentValue,
        dataSetName: v2DocumentStub.dataSetName,
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.pickUpEvent,
              name: 'OPEN',
            },
            [['vehicle-license-plate', vehicleLicensePlate]],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.dropOffEvent,
              name: MOVE,
            },
            [['move-type', 'Drop-off']],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.recyclerEvent,
              name: ACTOR,
            },
            [['actor-type', 'RECYCLER']],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.wasteGeneratorEvent,
              name: ACTOR,
            },
            [['actor-type', 'SOURCE']],
          ),
        ],
        subtype: v2DocumentStub.subtype,
        type: v2DocumentStub.type,
      });

      const v1DocumentId = await seedDocument({
        partialDocument: v1DocumentStub,
      });

      const result = await fetchSimilarMassIdDocuments({
        auditApiService,
        document: v2DocumentStub,
        eventsData,
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: v1DocumentId }),
          expect.objectContaining({ id: v2DocumentId }),
        ]),
      );
    });
  });
});
