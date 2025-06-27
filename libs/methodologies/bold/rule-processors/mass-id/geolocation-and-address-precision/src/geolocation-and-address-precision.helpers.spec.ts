import {
  stubAddress,
  stubBoldHomologationDocument,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  getEventGpsGeolocation,
  getHomologatedAddressByParticipantId,
} from './geolocation-and-address-precision.helpers';

const { FACILITY_ADDRESS, LEGAL_AND_ADMINISTRATIVE_COMPLIANCE } =
  DocumentEventName;
const { CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  DocumentEventAttributeName;

describe('GeolocationAndAddressPrecisionHelpers', () => {
  describe('getHomologatedAddressByParticipantId', () => {
    it('should return the homologated address by participant id', () => {
      const participantId = faker.string.uuid();
      const addressId = faker.string.uuid();

      const legalAndAdministrativeComplianceEvent = stubDocumentEvent({
        address: stubAddress({ id: addressId }),
        name: LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
        participant: stubParticipant({ id: participantId }),
      });

      const documentStub = stubBoldHomologationDocument({
        externalEventsMap: new Map([
          [
            FACILITY_ADDRESS,
            stubDocumentEvent({
              address: stubAddress({ id: addressId }),
              name: FACILITY_ADDRESS,
            }),
          ],
          [
            LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
            legalAndAdministrativeComplianceEvent,
          ],
        ]),
      });

      const result = getHomologatedAddressByParticipantId(participantId, [
        documentStub,
        ...stubArray(() =>
          stubBoldHomologationDocument({
            externalEventsMap: new Map([
              [
                FACILITY_ADDRESS,
                stubDocumentEvent({
                  address: stubAddress({ id: addressId }),
                  name: FACILITY_ADDRESS,
                }),
              ],
            ]),
          }),
        ),
      ]);

      expect(result?.id).toBe(legalAndAdministrativeComplianceEvent.address.id);
    });

    it('should return undefined if the participant has no homologated address', () => {
      const participantId = faker.string.uuid();
      const result = getHomologatedAddressByParticipantId(participantId, [
        ...stubArray(() =>
          stubBoldHomologationDocument({
            externalEventsMap: new Map([
              [FACILITY_ADDRESS, stubDocumentEvent({ name: FACILITY_ADDRESS })],
            ]),
          }),
        ),
      ]);

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
