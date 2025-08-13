import {
  stubAddress,
  stubBoldAccreditationDocument,
  stubBoldMassIdAuditDocument,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  getAccreditatedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
} from './geolocation-and-address-precision.helpers';

const { FACILITY_ADDRESS } = DocumentEventName;
const { CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  DocumentEventAttributeName;

describe('GeolocationAndAddressPrecisionHelpers', () => {
  describe('getAccreditatedAddressByParticipantIdAndActorType', () => {
    it('should return the accreditated address by participant id and actor type', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.RECYCLER;
      const addressId = faker.string.uuid();

      const accreditationDocument = stubBoldAccreditationDocument({
        externalEventsMap: new Map([
          [
            FACILITY_ADDRESS,
            stubDocumentEvent({
              address: stubAddress({ id: addressId }),
              name: FACILITY_ADDRESS,
            }),
          ],
        ]),
      });

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map([
          [
            'ACTOR',
            stubDocumentEvent({
              label: actorType,
              name: DocumentEventName.ACTOR,
              participant: stubParticipant({ id: participantId }),
              relatedDocument: { documentId: accreditationDocument.id },
            }),
          ],
        ]),
      });

      const result = getAccreditatedAddressByParticipantIdAndActorType(
        massIdAuditDocument,
        participantId,
        actorType,
        [
          accreditationDocument,
          ...stubArray(() => stubBoldAccreditationDocument()),
        ],
      );

      expect(result?.id).toBe(addressId);
    });

    it('should return undefined when actor event is not found', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.HAULER;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map(),
      });

      const result = getAccreditatedAddressByParticipantIdAndActorType(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when accreditation document id is missing in actor event', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.PROCESSOR;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map([
          [
            'ACTOR',
            stubDocumentEvent({
              label: actorType,
              name: DocumentEventName.ACTOR,
              participant: stubParticipant({ id: participantId }),
              relatedDocument: undefined,
            }),
          ],
        ]),
      });

      const result = getAccreditatedAddressByParticipantIdAndActorType(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when accreditation document is not found', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.WASTE_GENERATOR;

      const unrelatedAccreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map([
          [
            'ACTOR',
            stubDocumentEvent({
              label: actorType,
              name: DocumentEventName.ACTOR,
              participant: stubParticipant({ id: participantId }),
              relatedDocument: { documentId: faker.string.uuid() },
            }),
          ],
        ]),
      });

      const result = getAccreditatedAddressByParticipantIdAndActorType(
        massIdAuditDocument,
        participantId,
        actorType,
        [unrelatedAccreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when facility address event is not found in accreditation document', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.INTEGRATOR;

      const accreditationDocument = stubBoldAccreditationDocument({
        externalEventsMap: new Map(),
      });

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map([
          [
            'ACTOR',
            stubDocumentEvent({
              label: actorType,
              name: DocumentEventName.ACTOR,
              participant: stubParticipant({ id: participantId }),
              relatedDocument: { documentId: accreditationDocument.id },
            }),
          ],
        ]),
      });

      const result = getAccreditatedAddressByParticipantIdAndActorType(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getEventGpsGeolocation', () => {
    it('should return the gps geolocation of the event', () => {
      const latitude = faker.location.latitude();
      const longitude = faker.location.longitude();
      const event = stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [CAPTURED_GPS_LATITUDE, latitude],
          [CAPTURED_GPS_LONGITUDE, longitude],
        ],
      });

      const result = getEventGpsGeolocation(event);

      expect(result?.latitude).toBe(latitude);
      expect(result?.longitude).toBe(longitude);
    });

    it('should return undefined if the event has no gps geolocation metadata', () => {
      const event = stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [CAPTURED_GPS_LATITUDE, undefined],
          [CAPTURED_GPS_LONGITUDE, undefined],
        ],
      });

      const result = getEventGpsGeolocation(event);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the latitude and longitude are not valid', () => {
      const event = stubBoldMassIdPickUpEvent({
        metadataAttributes: [
          [CAPTURED_GPS_LATITUDE, 'invalid'],
          [CAPTURED_GPS_LONGITUDE, 'invalid'],
        ],
      });

      const result = getEventGpsGeolocation(event);

      expect(result).toBeUndefined();
    });
  });
});
