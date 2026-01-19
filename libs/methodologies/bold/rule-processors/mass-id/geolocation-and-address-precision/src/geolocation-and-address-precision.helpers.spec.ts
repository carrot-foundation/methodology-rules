import {
  type MetadataAttributeParameter,
  stubAddress,
  stubBoldAccreditationDocument,
  stubBoldAccreditationResultEvent,
  stubBoldMassIdAuditDocument,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyApprovedExceptionType } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import {
  getAccreditedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
  getGpsExceptionsFromRecyclerAccreditation,
  hasVerificationDocument,
} from './geolocation-and-address-precision.helpers';

const { ACCREDITATION_RESULT, FACILITY_ADDRESS } = DocumentEventName;
const { APPROVED_EXCEPTIONS, CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  DocumentEventAttributeName;

const createGpsException = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  attributeName:
    | DocumentEventAttributeName.CAPTURED_GPS_LATITUDE
    | DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE,
  reason: string,
  exceptionType: string = MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
) => ({
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID,
    },
    Event: eventName.toString(),
  },
  'Attribute Name': attributeName.toString(),
  'Exception Type': exceptionType,
  Reason: reason,
});

const createGpsExceptions = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  includeLatitude = true,
  includeLongitude = true,
  exceptionType?: string,
) => {
  const exceptions = [];

  if (includeLatitude) {
    exceptions.push(
      createGpsException(
        eventName,
        CAPTURED_GPS_LATITUDE,
        `GPS latitude exception for ${eventName}`,
        exceptionType,
      ),
    );
  }

  if (includeLongitude) {
    exceptions.push(
      createGpsException(
        eventName,
        CAPTURED_GPS_LONGITUDE,
        `GPS longitude exception for ${eventName}`,
        exceptionType,
      ),
    );
  }

  return exceptions;
};

const createDocumentWithExceptions = (
  exceptions: Array<ReturnType<typeof createGpsException>>,
) =>
  stubBoldAccreditationDocument({
    externalEventsMap: new Map([
      [
        ACCREDITATION_RESULT,
        stubBoldAccreditationResultEvent({
          metadataAttributes: [
            [APPROVED_EXCEPTIONS, exceptions],
          ] as MetadataAttributeParameter[],
        }),
      ],
    ]),
  });

const createMassIdAuditDocumentWithActor = (
  actorType: MassIdDocumentActorType,
  participantId: string,
  relatedDocumentId?: string,
  options?: {
    createWithUndefinedRelatedDocument?: boolean;
    relatedDocument?: { documentId: string };
  },
) => {
  const shouldCreateActor =
    relatedDocumentId !== undefined ||
    options?.createWithUndefinedRelatedDocument === true ||
    options?.relatedDocument !== undefined;

  let relatedDocument: undefined | { documentId: string };

  if (options?.createWithUndefinedRelatedDocument === true) {
    relatedDocument = undefined;
  } else if (options?.relatedDocument) {
    relatedDocument = options.relatedDocument;
  } else if (relatedDocumentId) {
    relatedDocument = { documentId: relatedDocumentId };
  } else {
    relatedDocument = undefined;
  }

  return stubBoldMassIdAuditDocument({
    externalEventsMap: new Map(
      shouldCreateActor
        ? [
            [
              'ACTOR',
              stubDocumentEvent({
                label: actorType,
                name: DocumentEventName.ACTOR,
                participant: stubParticipant({ id: participantId }),
                relatedDocument,
              }),
            ],
          ]
        : [],
    ),
  });
};

describe('GeolocationAndAddressPrecisionHelpers', () => {
  describe('getAccreditedAddressByParticipantIdAndActorType', () => {
    it('should return the accredited address by participant id and actor type', () => {
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

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        accreditationDocument.id,
      );

      const result = getAccreditedAddressByParticipantIdAndActorType(
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

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
      );

      const result = getAccreditedAddressByParticipantIdAndActorType(
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

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        undefined,
        { createWithUndefinedRelatedDocument: true },
      );

      const result = getAccreditedAddressByParticipantIdAndActorType(
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

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        faker.string.uuid(),
      );

      const result = getAccreditedAddressByParticipantIdAndActorType(
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

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        accreditationDocument.id,
      );

      const result = getAccreditedAddressByParticipantIdAndActorType(
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

  describe('hasVerificationDocument', () => {
    it('should return true when verification document exists', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.WASTE_GENERATOR;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        accreditationDocument.id,
      );

      const result = hasVerificationDocument(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBe(true);
    });

    it('should return false when actor event is not found', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.RECYCLER;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = stubBoldMassIdAuditDocument({
        externalEventsMap: new Map(),
      });

      const result = hasVerificationDocument(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBe(false);
    });

    it('should return false when accreditation document id is missing in actor event', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.PROCESSOR;

      const accreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        undefined,
        { createWithUndefinedRelatedDocument: true },
      );

      const result = hasVerificationDocument(
        massIdAuditDocument,
        participantId,
        actorType,
        [accreditationDocument],
      );

      expect(result).toBe(false);
    });

    it('should return false when accreditation document is not found', () => {
      const participantId = faker.string.uuid();
      const actorType = MassIdDocumentActorType.HAULER;

      const unrelatedAccreditationDocument = stubBoldAccreditationDocument();

      const massIdAuditDocument = createMassIdAuditDocumentWithActor(
        actorType,
        participantId,
        faker.string.uuid(),
      );

      const result = hasVerificationDocument(
        massIdAuditDocument,
        participantId,
        actorType,
        [unrelatedAccreditationDocument],
      );

      expect(result).toBe(false);
    });
  });

  describe('getGpsExceptionsFromRecyclerAccreditation', () => {
    it('should return undefined exceptions when recyclerAccreditationDocument is undefined', () => {
      const result = getGpsExceptionsFromRecyclerAccreditation(
        undefined,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeUndefined();
    });

    it('should return undefined exceptions when document has no ACCREDITATION_RESULT event', () => {
      const document = stubBoldAccreditationDocument({
        externalEventsMap: new Map(),
      });

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeUndefined();
    });

    it('should return undefined exceptions when document has no approved exceptions', () => {
      const document = stubBoldAccreditationDocument({
        externalEventsMap: new Map([
          [
            ACCREDITATION_RESULT,
            stubBoldAccreditationResultEvent({
              metadataAttributes: [],
            }),
          ],
        ]),
      });

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeUndefined();
    });

    it('should return valid GPS exceptions when document has valid latitude and longitude exceptions for DROP_OFF', () => {
      const exceptions = createGpsExceptions(DocumentEventName.DROP_OFF);
      const document = createDocumentWithExceptions(exceptions);

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeDefined();
      expect(result.latitudeException?.['Attribute Name']).toBe(
        CAPTURED_GPS_LATITUDE.toString(),
      );
      expect(result.longitudeException).toBeDefined();
      expect(result.longitudeException?.['Attribute Name']).toBe(
        CAPTURED_GPS_LONGITUDE.toString(),
      );
    });

    it('should return valid GPS exceptions when document has valid latitude and longitude exceptions for PICK_UP', () => {
      const exceptions = createGpsExceptions(DocumentEventName.PICK_UP);
      const document = createDocumentWithExceptions(exceptions);

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.PICK_UP,
      );

      expect(result.latitudeException).toBeDefined();
      expect(result.latitudeException?.['Attribute Name']).toBe(
        CAPTURED_GPS_LATITUDE.toString(),
      );
      expect(result.longitudeException).toBeDefined();
      expect(result.longitudeException?.['Attribute Name']).toBe(
        CAPTURED_GPS_LONGITUDE.toString(),
      );
    });

    it('should return undefined for exceptions that do not match the event name', () => {
      const exceptions = createGpsExceptions(DocumentEventName.PICK_UP);
      const document = createDocumentWithExceptions(exceptions);

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeUndefined();
    });

    it('should return undefined for exceptions that do not match the GPS attribute names', () => {
      const exceptions = [
        {
          'Attribute Location': {
            Asset: {
              Category: DocumentCategory.MASS_ID,
            },
            Event: DocumentEventName.DROP_OFF.toString(),
          },
          'Attribute Name': DocumentEventAttributeName.TARE.toString(),
          'Exception Type':
            MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Tare exception (not GPS)',
        },
      ];
      const document = createDocumentWithExceptions(exceptions);

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeUndefined();
    });

    it('should return undefined for latitude when exception does not pass type guard', () => {
      const exceptions = [
        createGpsException(
          DocumentEventName.DROP_OFF,
          CAPTURED_GPS_LATITUDE,
          'Invalid exception type',
          'INVALID_TYPE',
        ),
        createGpsException(
          DocumentEventName.DROP_OFF,
          CAPTURED_GPS_LONGITUDE,
          'GPS longitude exception for DROP_OFF',
        ),
      ];
      const document = createDocumentWithExceptions(exceptions);

      const result = getGpsExceptionsFromRecyclerAccreditation(
        document,
        DocumentEventName.DROP_OFF,
      );

      expect(result.latitudeException).toBeUndefined();
      expect(result.longitudeException).toBeDefined();
    });
  });
});
