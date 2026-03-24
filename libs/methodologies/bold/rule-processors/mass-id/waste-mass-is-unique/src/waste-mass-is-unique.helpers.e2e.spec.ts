import { seedDocument } from '@carrot-fndn/shared/document/seeds';
import { AuditApiService } from '@carrot-fndn/shared/methodologies/audit-api';
import {
  BoldStubsBuilder,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type LicensePlate,
  type MethodologyDocument,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

import {
  type EventsData,
  fetchSimilarMassIDDocuments,
} from './waste-mass-is-unique.helpers';

describe('Waste Mass Is Unique Helpers E2E', () => {
  let auditApiService: AuditApiService;
  let v2DocumentId: NonEmptyString;
  let v2DocumentStub: MethodologyDocument;

  const vehicleLicensePlate = 'ABC1D23' as LicensePlate;
  const eventsData: EventsData = {
    dropOffEvent: stubBoldMassIDDropOffEvent(),
    pickUpEvent: stubBoldMassIDPickUpEvent({
      metadataAttributes: [
        {
          name: 'Vehicle License Plate',
          value: vehicleLicensePlate,
        },
      ],
    }),
    recyclerEvent: stubDocumentEvent({
      label: 'Recycler',
      name: 'ACTOR',
    }),
    vehicleLicensePlate,
    wasteGeneratorEvent: stubDocumentEvent({
      label: 'Waste Generator',
      name: 'ACTOR',
    }),
  };

  beforeAll(async () => {
    auditApiService = new AuditApiService();

    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments({
        externalEventsMap: {
          'ACTOR-Recycler': eventsData.recyclerEvent,
          'ACTOR-Waste Generator': eventsData.wasteGeneratorEvent,
          'Drop-off': eventsData.dropOffEvent,
          'Pick-up': eventsData.pickUpEvent,
        },
      })
      .build();

    v2DocumentStub = massIDDocument;

    v2DocumentId = await seedDocument({
      partialDocument: v2DocumentStub,
    });
  });

  describe('fetchSimilarMassIDDocuments', () => {
    it('should return an empty array when no similar documents are found', async () => {
      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments()
        .build();

      const result = await fetchSimilarMassIDDocuments({
        auditApiService,
        document: massIDDocument,
        eventsData: {
          dropOffEvent: stubBoldMassIDDropOffEvent(),
          pickUpEvent: stubBoldMassIDPickUpEvent(),
          recyclerEvent: stubDocumentEvent({
            label: 'Recycler',
            name: 'ACTOR',
          }),
          vehicleLicensePlate: 'DEF2G45' as LicensePlate,
          wasteGeneratorEvent: stubDocumentEvent({
            label: 'Waste Generator',
            name: 'ACTOR',
          }),
        },
      });

      expect(result).toEqual([]);
    });

    it('should return a list of similar documents when similar documents are found', async () => {
      const duplicatedDocumentId = await seedDocument({
        partialDocument: v2DocumentStub,
      });

      const result = await fetchSimilarMassIDDocuments({
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
              name: 'MOVE',
            },
            [['move-type', 'Drop-off']],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.recyclerEvent,
              name: 'ACTOR',
            },
            [['actor-type', 'RECYCLER']],
          ),
          stubDocumentEventWithMetadataAttributes(
            {
              ...eventsData.wasteGeneratorEvent,
              name: 'ACTOR',
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

      const result = await fetchSimilarMassIDDocuments({
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
