import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  generateNearbyCoordinates,
  MASS_ID_ACTOR_PARTICIPANTS,
  type MetadataAttributeParameter,
  stubAddress,
  stubBoldAccreditationResultEvent,
  type StubBoldDocumentParameters,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyApprovedExceptionType,
  type MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { expect } from 'vitest';

import {
  DISTANCE_THRESHOLD_SIMILARITY,
  RESULT_COMMENTS,
} from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';

interface GeolocationAndAddressPrecisionErrorTestCase extends RuleTestCase {
  documents: Document[];
  massIDAuditDocument: Document | undefined;
}

interface GeolocationAndAddressPrecisionTestCase extends RuleTestCase {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  actorParticipants: Map<string, MethodologyParticipant>;
  massIDDocumentParameters?: StubBoldDocumentParameters | undefined;
}

const { RECYCLER, WASTE_GENERATOR } = MassIDDocumentActorType;
const {
  ACCREDITATION_CONTEXT,
  ACCREDITATION_RESULT,
  ACTOR,
  DROP_OFF,
  FACILITY_ADDRESS,
  LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
  PICK_UP,
} = DocumentEventName;
const { APPROVED_EXCEPTIONS, CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  DocumentEventAttributeName;

const actorParticipants = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({ id: faker.string.uuid(), type: subtype }),
  ]),
);
const actorsCoordinates = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    generateNearbyCoordinates(),
  ]),
);

const recyclerParticipant = actorParticipants.get(
  RECYCLER,
) as MethodologyParticipant;
const wasteGeneratorParticipant = actorParticipants.get(
  WASTE_GENERATOR,
) as MethodologyParticipant;

const recyclerAddress = stubAddress({
  ...actorsCoordinates.get(RECYCLER)!.base,
});
const wasteGeneratorAddress = stubAddress({
  ...actorsCoordinates.get(WASTE_GENERATOR)!.base,
});
const invalidRecyclerAddress = stubAddress({
  latitude: 40.7128,
  longitude: -74.006,
});
const invalidWasteGeneratorAddress = stubAddress({
  latitude: 34.0522,
  longitude: -118.2437,
});
const nearbyRecyclerAddress = stubAddress({
  ...actorsCoordinates.get(RECYCLER)!.nearby,
});

const invalidRecyclerAddressDistance = calculateDistance(
  recyclerAddress,
  invalidRecyclerAddress,
);
const invalidWasteGeneratorAddressDistance = calculateDistance(
  wasteGeneratorAddress,
  invalidWasteGeneratorAddress,
);
const nearbyRecyclerAddressDistance = calculateDistance(
  recyclerAddress,
  nearbyRecyclerAddress,
);

// Deterministic values for manifestExample test cases
const manifestActorParticipants = new Map(
  MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({
      id: `manifest-participant-${subtype}`,
      type: subtype,
    }),
  ]),
);
const manifestRecyclerParticipant = manifestActorParticipants.get(
  RECYCLER,
) as MethodologyParticipant;
const manifestWasteGeneratorParticipant = manifestActorParticipants.get(
  WASTE_GENERATOR,
) as MethodologyParticipant;

const manifestRecyclerAddress = stubAddress({
  latitude: -23.5505,
  longitude: -46.6333,
});
const manifestWasteGeneratorAddress = stubAddress({
  latitude: -22.9068,
  longitude: -43.1729,
});
const manifestNearbyRecyclerAddress = stubAddress({
  latitude: -23.5506,
  longitude: -46.6334,
});
const manifestNearbyWasteGeneratorAddress = stubAddress({
  latitude: -22.9069,
  longitude: -43.173,
});
const manifestInvalidRecyclerAddress = stubAddress({
  latitude: 40.7128,
  longitude: -74.006,
});
const manifestInvalidWasteGeneratorAddress = stubAddress({
  latitude: 34.0522,
  longitude: -118.2437,
});

const manifestNearbyRecyclerAddressDistance = calculateDistance(
  manifestRecyclerAddress,
  manifestNearbyRecyclerAddress,
);
const manifestNearbyWasteGeneratorAddressDistance = calculateDistance(
  manifestWasteGeneratorAddress,
  manifestNearbyWasteGeneratorAddress,
);
const manifestInvalidRecyclerAddressDistance = calculateDistance(
  manifestRecyclerAddress,
  manifestInvalidRecyclerAddress,
);
const manifestInvalidWasteGeneratorAddressDistance = calculateDistance(
  manifestWasteGeneratorAddress,
  manifestInvalidWasteGeneratorAddress,
);

// Addresses for similarity tier testing (2-30km band)
// Fictional addresses ~16km apart in the same city, similar street names
const similarRecyclerEventAddress = stubAddress({
  city: 'Vila Verde',
  countryCode: 'XX',
  countryState: 'Norte',
  latitude: -10.0,
  longitude: -40.0,
  number: '100',
  street: 'Rua das Flores',
});
const similarRecyclerAccreditedAddress = stubAddress({
  city: 'Vila Verde',
  countryCode: 'XX',
  countryState: 'Norte',
  latitude: -10.14,
  longitude: -40.03,
  number: '100',
  street: 'R. das Flores',
});
const mismatchedStateAddress = stubAddress({
  ...similarRecyclerAccreditedAddress,
  countryState: 'Sul',
});

const dissimilarRecyclerAccreditedAddress = stubAddress({
  city: 'Cidade Nova',
  countryCode: 'XX',
  countryState: 'Norte',
  latitude: -10.14,
  longitude: -40.03,
  number: '500',
  street: 'Av. Central',
});
const farRecyclerAccreditedAddress = stubAddress({
  city: 'Porto Distante',
  countryCode: 'XX',
  countryState: 'Sul',
  latitude: -13.0,
  longitude: -43.0,
});

const similarRecyclerParticipant = stubParticipant({
  id: faker.string.uuid(),
  type: RECYCLER,
});
const similarWasteGeneratorParticipant = stubParticipant({
  id: faker.string.uuid(),
  type: WASTE_GENERATOR,
});
const similarWasteGeneratorAddress = stubAddress({
  ...actorsCoordinates.get(WASTE_GENERATOR)!.base,
});

const createGpsException = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  attributeName:
    | DocumentEventAttributeName.CAPTURED_GPS_LATITUDE
    | DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE,
  reason: string,
  validUntil?: string,
) => ({
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID,
    },
    Event: eventName.toString(),
  },
  'Attribute Name': attributeName.toString(),
  'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
  Reason: reason,
  ...(validUntil && { 'Valid Until': validUntil }),
});

const createGpsExceptions = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  includeLatitude = true,
  includeLongitude = true,
  validUntil?: string,
) => {
  const exceptions = [];

  if (includeLatitude) {
    exceptions.push(
      createGpsException(
        eventName,
        CAPTURED_GPS_LATITUDE,
        `GPS latitude exception for ${eventName} event`,
        validUntil,
      ),
    );
  }

  if (includeLongitude) {
    exceptions.push(
      createGpsException(
        eventName,
        CAPTURED_GPS_LONGITUDE,
        `GPS longitude exception for ${eventName} event`,
        validUntil,
      ),
    );
  }

  return exceptions;
};

const createAccreditationDocumentWithAddress = (
  address: ReturnType<typeof stubAddress>,
  participant: MethodologyParticipant,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [FACILITY_ADDRESS]: stubDocumentEvent({
      address,
      name: FACILITY_ADDRESS,
      participant,
    }),
    [LEGAL_AND_ADMINISTRATIVE_COMPLIANCE]: stubDocumentEvent({
      address,
      name: LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
      participant,
    }),
  },
});

const createAccreditationDocumentWithGpsExceptions = (
  address: ReturnType<typeof stubAddress>,
  participant: MethodologyParticipant,
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  includeLatitude = true,
  includeLongitude = true,
  validUntil?: string,
): StubBoldDocumentParameters => ({
  externalEventsMap: {
    [ACCREDITATION_RESULT]: stubBoldAccreditationResultEvent({
      metadataAttributes: [
        [
          APPROVED_EXCEPTIONS,
          createGpsExceptions(
            eventName,
            includeLatitude,
            includeLongitude,
            validUntil,
          ),
        ],
      ] as MetadataAttributeParameter[],
    }),
    [FACILITY_ADDRESS]: stubDocumentEvent({
      address,
      name: FACILITY_ADDRESS,
      participant,
    }),
    [LEGAL_AND_ADMINISTRATIVE_COMPLIANCE]: stubDocumentEvent({
      address,
      name: LEGAL_AND_ADMINISTRATIVE_COMPLIANCE,
      participant,
    }),
  },
});

const createMassIDEvent = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  address: ReturnType<typeof stubAddress>,
  participant: MethodologyParticipant,
  gpsLatitude?: number,
  gpsLongitude?: number,
) => {
  const createEvent =
    eventName === DROP_OFF
      ? stubBoldMassIDDropOffEvent
      : stubBoldMassIDPickUpEvent;

  return createEvent({
    metadataAttributes: [
      [CAPTURED_GPS_LATITUDE, gpsLatitude],
      [CAPTURED_GPS_LONGITUDE, gpsLongitude],
    ],
    partialDocumentEvent: {
      address,
      participant,
    },
  });
};

const validAccreditationDocuments = new Map([
  [
    RECYCLER,
    createAccreditationDocumentWithAddress(
      recyclerAddress,
      recyclerParticipant,
    ),
  ],
  [
    WASTE_GENERATOR,
    createAccreditationDocumentWithAddress(
      wasteGeneratorAddress,
      wasteGeneratorParticipant,
    ),
  ],
]);

const recyclerActorEvent = stubDocumentEvent({
  address: recyclerAddress,
  label: RECYCLER,
  name: ACTOR,
  participant: recyclerParticipant,
});
const wasteGeneratorActorEvent = stubDocumentEvent({
  address: wasteGeneratorAddress,
  label: WASTE_GENERATOR,
  name: ACTOR,
  participant: wasteGeneratorParticipant,
});

const manifestValidAccreditationDocuments = new Map([
  [
    RECYCLER,
    createAccreditationDocumentWithAddress(
      manifestRecyclerAddress,
      manifestRecyclerParticipant,
    ),
  ],
  [
    WASTE_GENERATOR,
    createAccreditationDocumentWithAddress(
      manifestWasteGeneratorAddress,
      manifestWasteGeneratorParticipant,
    ),
  ],
]);
const manifestRecyclerActorEvent = stubDocumentEvent({
  address: manifestRecyclerAddress,
  label: RECYCLER,
  name: ACTOR,
  participant: manifestRecyclerParticipant,
});
const manifestWasteGeneratorActorEvent = stubDocumentEvent({
  address: manifestWasteGeneratorAddress,
  label: WASTE_GENERATOR,
  name: ACTOR,
  participant: manifestWasteGeneratorParticipant,
});

export const geolocationAndAddressPrecisionTestCases: GeolocationAndAddressPrecisionTestCase[] =
  [
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          {
            externalEventsMap: {
              [ACCREDITATION_CONTEXT]: undefined,
            },
          },
        ],
        [
          WASTE_GENERATOR,
          {
            externalEventsMap: {
              [ACCREDITATION_CONTEXT]: undefined,
            },
          },
        ],
      ]),
      actorParticipants,
      resultComment: `${RESULT_COMMENTS.passed.OPTIONAL_VALIDATION_SKIPPED(WASTE_GENERATOR)} ${RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(RECYCLER)}`,
      resultStatus: 'FAILED',
      scenario: 'The accredited address is not set',
    },
    {
      accreditationDocuments: manifestValidAccreditationDocuments,
      actorParticipants: manifestActorParticipants,
      manifestExample: true,
      manifestFields: { addressFields: ['latitude', 'longitude'] },
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: manifestRecyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: manifestWasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            manifestNearbyRecyclerAddress,
            manifestRecyclerParticipant,
            manifestNearbyRecyclerAddress.latitude,
            manifestNearbyRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            manifestNearbyWasteGeneratorAddress,
            manifestWasteGeneratorParticipant,
            manifestNearbyWasteGeneratorAddress.latitude,
            manifestNearbyWasteGeneratorAddress.longitude,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITH_GPS(WASTE_GENERATOR, manifestNearbyWasteGeneratorAddressDistance, manifestNearbyWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.passed.PASSED_WITH_GPS(RECYCLER, manifestNearbyRecyclerAddressDistance, manifestNearbyRecyclerAddressDistance)}`,
      resultStatus: 'PASSED',
      scenario:
        'The GPS is set and both GPS coordinates and event address are valid and within the allowed radius',
    },
    {
      accreditationDocuments: manifestValidAccreditationDocuments,
      actorParticipants: manifestActorParticipants,
      manifestExample: true,
      manifestFields: { addressFields: ['latitude', 'longitude'] },
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: manifestRecyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: manifestWasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            manifestNearbyRecyclerAddress,
            manifestRecyclerParticipant,
            manifestInvalidRecyclerAddress.latitude,
            manifestInvalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            manifestNearbyWasteGeneratorAddress,
            manifestWasteGeneratorParticipant,
            manifestInvalidWasteGeneratorAddress.latitude,
            manifestInvalidWasteGeneratorAddress.longitude,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(WASTE_GENERATOR, manifestInvalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(RECYCLER, manifestInvalidRecyclerAddressDistance)}`,
      resultStatus: 'FAILED',
      scenario: 'The address is valid but the GPS geolocation is invalid',
    },
    {
      accreditationDocuments: validAccreditationDocuments,
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            nearbyRecyclerAddress,
            recyclerParticipant,
            invalidRecyclerAddress.latitude,
            invalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: undefined,
        },
      },
      resultComment: RESULT_COMMENTS.failed.INVALID_ACTOR_TYPE,
      resultStatus: 'FAILED',
      scenario: 'The processor cannot extract the actor type',
    },
    {
      accreditationDocuments: manifestValidAccreditationDocuments,
      actorParticipants: manifestActorParticipants,
      manifestExample: true,
      manifestFields: { addressFields: ['latitude', 'longitude'] },
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: manifestRecyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: manifestWasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            manifestRecyclerAddress,
            manifestRecyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            manifestWasteGeneratorAddress,
            manifestWasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(RECYCLER, 0)}`,
      resultStatus: 'PASSED',
      scenario:
        'The GPS is not set, but the accredited address is set and is valid',
    },
    {
      accreditationDocuments: validAccreditationDocuments,
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            invalidRecyclerAddress,
            recyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            invalidWasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.failed.INVALID_ADDRESS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.failed.INVALID_ADDRESS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
      resultStatus: 'FAILED',
      scenario:
        'The GPS is not set, but the accredited address is set and not valid',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithAddress(
            recyclerAddress,
            recyclerParticipant,
          ),
        ],
        [
          WASTE_GENERATOR,
          {
            externalEventsMap: {
              [ACCREDITATION_CONTEXT]: undefined,
            },
          },
        ],
      ]),
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            recyclerAddress,
            recyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.OPTIONAL_VALIDATION_SKIPPED(WASTE_GENERATOR)} ${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(RECYCLER, 0)}`,
      resultStatus: 'PASSED',
      scenario:
        'The Waste Generator verification document is missing (should pass, not fail)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithGpsExceptions(
            recyclerAddress,
            recyclerParticipant,
            DROP_OFF,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            nearbyRecyclerAddress,
            recyclerParticipant,
            invalidRecyclerAddress.latitude,
            invalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION(RECYCLER, nearbyRecyclerAddressDistance)}`,
      resultStatus: 'PASSED',
      scenario:
        'The Recycler has GPS exceptions for DROP_OFF event (GPS validation should be skipped for Recycler on DROP_OFF)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithGpsExceptions(
            recyclerAddress,
            recyclerParticipant,
            DROP_OFF,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            nearbyRecyclerAddress,
            recyclerParticipant,
            invalidRecyclerAddress.latitude,
            invalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION(RECYCLER, nearbyRecyclerAddressDistance)}`,
      resultStatus: 'PASSED',
      scenario:
        'The Recycler has GPS exceptions for DROP_OFF event (GPS validation should be skipped)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithGpsExceptions(
            recyclerAddress,
            recyclerParticipant,
            DROP_OFF,
            true, // includeLatitude
            false, // includeLongitude - missing longitude exception
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            nearbyRecyclerAddress,
            recyclerParticipant,
            invalidRecyclerAddress.latitude,
            invalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
      resultStatus: 'FAILED',
      scenario:
        'The Recycler has only latitude GPS exception (should NOT skip GPS validation)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithGpsExceptions(
            recyclerAddress,
            recyclerParticipant,
            DROP_OFF,
            true, // includeLatitude
            true, // includeLongitude
            '2020-01-01', // validUntil - expired exception
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants,
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
          [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            nearbyRecyclerAddress,
            recyclerParticipant,
            invalidRecyclerAddress.latitude,
            invalidRecyclerAddress.longitude,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            wasteGeneratorAddress,
            wasteGeneratorParticipant,
          ),
        },
      },
      resultComment: `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
      resultStatus: 'FAILED',
      scenario:
        'The Recycler has expired GPS exceptions (should NOT skip GPS validation)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithAddress(
            similarRecyclerAccreditedAddress,
            similarRecyclerParticipant,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants: new Map([
        ...actorParticipants,
        [RECYCLER, similarRecyclerParticipant],
        [WASTE_GENERATOR, similarWasteGeneratorParticipant],
      ]),
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
            address: similarRecyclerEventAddress,
            label: RECYCLER,
            name: ACTOR,
            participant: similarRecyclerParticipant,
          }),
          [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
            address: similarWasteGeneratorAddress,
            label: WASTE_GENERATOR,
            name: ACTOR,
            participant: similarWasteGeneratorParticipant,
          }),
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            similarRecyclerEventAddress,
            similarRecyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      resultComment: expect.stringContaining('similarity'),
      resultStatus: 'REVIEW_REQUIRED',
      scenario:
        'Recycler address is 2-30km away but textual address matches by similarity (REVIEW_REQUIRED)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithAddress(
            dissimilarRecyclerAccreditedAddress,
            similarRecyclerParticipant,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants: new Map([
        ...actorParticipants,
        [RECYCLER, similarRecyclerParticipant],
        [WASTE_GENERATOR, similarWasteGeneratorParticipant],
      ]),
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
            address: similarRecyclerEventAddress,
            label: RECYCLER,
            name: ACTOR,
            participant: similarRecyclerParticipant,
          }),
          [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
            address: similarWasteGeneratorAddress,
            label: WASTE_GENERATOR,
            name: ACTOR,
            participant: similarWasteGeneratorParticipant,
          }),
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            similarRecyclerEventAddress,
            similarRecyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      resultComment: expect.stringContaining('similarity is only'),
      resultStatus: 'FAILED',
      scenario:
        'Recycler address is 2-30km away and textual address does not match (FAILED)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithAddress(
            mismatchedStateAddress,
            similarRecyclerParticipant,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants: new Map([
        ...actorParticipants,
        [RECYCLER, similarRecyclerParticipant],
        [WASTE_GENERATOR, similarWasteGeneratorParticipant],
      ]),
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
            address: similarRecyclerEventAddress,
            label: RECYCLER,
            name: ACTOR,
            participant: similarRecyclerParticipant,
          }),
          [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
            address: similarWasteGeneratorAddress,
            label: WASTE_GENERATOR,
            name: ACTOR,
            participant: similarWasteGeneratorParticipant,
          }),
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            similarRecyclerEventAddress,
            similarRecyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      resultComment: expect.stringContaining('country or state do not match'),
      resultStatus: 'FAILED',
      scenario:
        'Recycler address is 2-30km away but state does not match (FAILED)',
    },
    {
      accreditationDocuments: new Map([
        [
          RECYCLER,
          createAccreditationDocumentWithAddress(
            farRecyclerAccreditedAddress,
            similarRecyclerParticipant,
          ),
        ],
        [
          WASTE_GENERATOR,
          createAccreditationDocumentWithAddress(
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        ],
      ]),
      actorParticipants: new Map([
        ...actorParticipants,
        [RECYCLER, similarRecyclerParticipant],
        [WASTE_GENERATOR, similarWasteGeneratorParticipant],
      ]),
      massIDDocumentParameters: {
        externalEventsMap: {
          [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
            address: similarRecyclerEventAddress,
            label: RECYCLER,
            name: ACTOR,
            participant: similarRecyclerParticipant,
          }),
          [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
            address: similarWasteGeneratorAddress,
            label: WASTE_GENERATOR,
            name: ACTOR,
            participant: similarWasteGeneratorParticipant,
          }),
          [DROP_OFF]: createMassIDEvent(
            DROP_OFF,
            similarRecyclerEventAddress,
            similarRecyclerParticipant,
          ),
          [PICK_UP]: createMassIDEvent(
            PICK_UP,
            similarWasteGeneratorAddress,
            similarWasteGeneratorParticipant,
          ),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      resultComment: expect.stringContaining(
        `exceeding the ${DISTANCE_THRESHOLD_SIMILARITY} m limit`,
      ),
      resultStatus: 'FAILED',
      scenario: 'Recycler address is beyond 30km (FAILED)',
    },
  ];

const errorMessage = new GeolocationAndAddressPrecisionProcessorErrors();

const {
  massIDAuditDocument,
  massIDDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIDDocuments({
    externalEventsMap: {
      [DROP_OFF]: undefined,
      [PICK_UP]: undefined,
    },
  })
  .createMassIDAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const geolocationAndAddressPrecisionErrorTestCases: GeolocationAndAddressPrecisionErrorTestCase[] =
  [
    {
      documents: [
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument,
      resultComment: errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID document does not exist',
    },
    {
      documents: [
        massIDDocument,
        massIDAuditDocument,
        ...participantsAccreditationDocuments.values(),
      ],
      massIDAuditDocument,
      resultComment:
        errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
          massIDDocument.id,
        ),
      resultStatus: 'FAILED',
      scenario:
        'The MassID document does not contain a DROP_OFF or PICK_UP event',
    },
    {
      documents: [massIDDocument, massIDAuditDocument],
      massIDAuditDocument,
      resultComment:
        errorMessage.ERROR_MESSAGE
          .PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The accreditation documents were not found',
    },
    {
      documents: [],
      massIDAuditDocument: undefined,
      resultComment:
        errorMessage.ERROR_MESSAGE.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID Audit document does not exist',
    },
  ];
