import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  generateNearbyCoordinates,
  MASS_ID_ACTOR_PARTICIPANTS,
  type MetadataAttributeParameter,
  stubAddress,
  stubBoldAccreditationResultEvent,
  type StubBoldDocumentParameters,
  stubBoldMassIdDropOffEvent,
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
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  MethodologyApprovedExceptionType,
  type MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import { RESULT_COMMENTS } from './geolocation-and-address-precision.processor';

const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
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
const nearbyWasteGeneratorAddress = stubAddress({
  ...actorsCoordinates.get(WASTE_GENERATOR)!.nearby,
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
const nearbyWasteGeneratorAddressDistance = calculateDistance(
  wasteGeneratorAddress,
  nearbyWasteGeneratorAddress,
);

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

const createMassIdEvent = (
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP,
  address: ReturnType<typeof stubAddress>,
  participant: MethodologyParticipant,
  gpsLatitude?: number,
  gpsLongitude?: number,
) => {
  const createEvent =
    eventName === DROP_OFF
      ? stubBoldMassIdDropOffEvent
      : stubBoldMassIdPickUpEvent;

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

export const geolocationAndAddressPrecisionTestCases: Array<{
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  actorParticipants: Map<string, MethodologyParticipant>;
  massIdDocumentParameters?: StubBoldDocumentParameters | undefined;
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
}> = [
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
    resultComment: `${RESULT_COMMENTS.OPTIONAL_VALIDATION_SKIPPED(WASTE_GENERATOR)} ${RESULT_COMMENTS.MISSING_ACCREDITATION_ADDRESS(RECYCLER)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the accredited address is not set',
  },
  {
    accreditationDocuments: validAccreditationDocuments,
    actorParticipants,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          nearbyRecyclerAddress.latitude,
          nearbyRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          nearbyWasteGeneratorAddress,
          wasteGeneratorParticipant,
          nearbyWasteGeneratorAddress.latitude,
          nearbyWasteGeneratorAddress.longitude,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITH_GPS(WASTE_GENERATOR, nearbyWasteGeneratorAddressDistance, nearbyWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.PASSED_WITH_GPS(RECYCLER, nearbyRecyclerAddressDistance, nearbyRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the gps is set and both gps geolocation and event address are valid but nearby',
  },
  {
    accreditationDocuments: validAccreditationDocuments,
    actorParticipants,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          nearbyWasteGeneratorAddress,
          wasteGeneratorParticipant,
          invalidWasteGeneratorAddress.latitude,
          invalidWasteGeneratorAddress.longitude,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.INVALID_GPS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the address is valid but the gps geolocation is invalid',
  },
  {
    accreditationDocuments: validAccreditationDocuments,
    actorParticipants,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: undefined,
      },
    },
    resultComment: RESULT_COMMENTS.INVALID_ACTOR_TYPE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the processor cannot extract the actor type',
  },
  {
    accreditationDocuments: validAccreditationDocuments,
    actorParticipants,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          recyclerAddress,
          recyclerParticipant,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.PASSED_WITHOUT_GPS(RECYCLER, 0)}`,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the gps is not set, but the accredited address is set and is valid',
  },
  {
    accreditationDocuments: validAccreditationDocuments,
    actorParticipants,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          invalidRecyclerAddress,
          recyclerParticipant,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          invalidWasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the gps is not set, but the accredited address is set and not valid',
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
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          recyclerAddress,
          recyclerParticipant,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.OPTIONAL_VALIDATION_SKIPPED(WASTE_GENERATOR)} ${RESULT_COMMENTS.PASSED_WITHOUT_GPS(RECYCLER, 0)}`,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the Waste Generator verification document is missing (should pass, not fail)',
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
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.PASSED_WITH_GPS_EXCEPTION(RECYCLER, nearbyRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the Recycler has GPS exceptions for DROP_OFF event (GPS validation should be skipped for Recycler on DROP_OFF)',
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
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.PASSED_WITH_GPS_EXCEPTION(RECYCLER, nearbyRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the Recycler has GPS exceptions for DROP_OFF event (GPS validation should be skipped)',
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
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Recycler has only latitude GPS exception (should NOT skip GPS validation)',
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
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: createMassIdEvent(
          DROP_OFF,
          nearbyRecyclerAddress,
          recyclerParticipant,
          invalidRecyclerAddress.latitude,
          invalidRecyclerAddress.longitude,
        ),
        [PICK_UP]: createMassIdEvent(
          PICK_UP,
          wasteGeneratorAddress,
          wasteGeneratorParticipant,
        ),
      },
    },
    resultComment: `${RESULT_COMMENTS.PASSED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the Recycler has expired GPS exceptions (should NOT skip GPS validation)',
  },
];

const errorMessage = new GeolocationAndAddressPrecisionProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsAccreditationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [DROP_OFF]: undefined,
      [PICK_UP]: undefined,
    },
  })
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantAccreditationDocuments()
  .build();

export const geolocationAndAddressPrecisionErrorTestCases = [
  {
    documents: [
      massIdAuditDocument,
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID document does not exist',
  },
  {
    documents: [
      massIdDocument,
      massIdAuditDocument,
      ...participantsAccreditationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment:
      errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
        massIdDocument.id,
      ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario:
      'the MassId document does not contain a DROP_OFF or PICK_UP event',
  },
  {
    documents: [massIdDocument, massIdAuditDocument],
    massIdAuditDocument,
    resultComment:
      errorMessage.ERROR_MESSAGE.PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the accreditation documents are not found',
  },
  {
    documents: [],
    massIdAuditDocument: undefined,
    resultComment: errorMessage.ERROR_MESSAGE.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the MassID Audit document does not exist',
  },
];
