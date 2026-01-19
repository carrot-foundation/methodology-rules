import {
  stubAddress,
  stubBoldAccreditationDocument,
  stubBoldMassIDAuditDocument,
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  getAccreditedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
} from './geolocation-and-address-precision.helpers';

const { FACILITY_ADDRESS } = DocumentEventName;
const { CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  DocumentEventAttributeName;

describe('GeolocationAndAddressPrecisionHelpers', () => {
  describe('getAccreditedAddressByParticipantIdAndActorType', () => {
    it('should return the accredited address by participant id and actor type', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIDDocumentActorType.RECYCLER;
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

      const massIDAuditDocument = stubBoldMassIDAuditDocument({
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

      const result = getAccreditedAddressByParticipantIdAndActorType(
        massIDAuditDocument,
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
      const actorType = MassIDDocumentActorType.HAULER;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIDAuditDocument = stubBoldMassIDAuditDocument({
        externalEventsMap: new Map(),
      });

      const result = getAccreditedAddressByParticipantIdAndActorType(
        massIDAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when accreditation document id is missing in actor event', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIDDocumentActorType.PROCESSOR;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIDAuditDocument = stubBoldMassIDAuditDocument({
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

      const result = getAccreditedAddressByParticipantIdAndActorType(
        massIDAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when accreditation document is not found', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIDDocumentActorType.WASTE_GENERATOR;

      const unrelatedAccreditationDocument = stubBoldAccreditationDocument();

      const massIDAuditDocument = stubBoldMassIDAuditDocument({
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

      const result = getAccreditedAddressByParticipantIdAndActorType(
        massIDAuditDocument,
        participantId,
        actorType,
        [unrelatedAccreditationDocument],
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when facility address event is not found in accreditation document', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIDDocumentActorType.INTEGRATOR;

      const accreditationDocument = stubBoldAccreditationDocument({
        externalEventsMap: new Map(),
      });

      const massIDAuditDocument = stubBoldMassIDAuditDocument({
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

      const result = getAccreditedAddressByParticipantIdAndActorType(
        massIDAuditDocument,
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
      const event = stubBoldMassIDPickUpEvent({
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
      const event = stubBoldMassIDPickUpEvent({
        metadataAttributes: [
          [CAPTURED_GPS_LATITUDE, undefined],
          [CAPTURED_GPS_LONGITUDE, undefined],
        ],
      });

      const result = getEventGpsGeolocation(event);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the latitude and longitude are not valid', () => {
      const event = stubBoldMassIDPickUpEvent({
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
