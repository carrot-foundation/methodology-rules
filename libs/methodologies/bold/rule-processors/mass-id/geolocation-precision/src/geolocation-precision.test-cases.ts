import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  MASS_ID_ACTOR_PARTICIPANTS,
  type StubBoldDocumentParameters,
  generateNearbyCoordinates,
  stubAddress,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { type MethodologyParticipant } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { GeolocationPrecisionProcessorErrors } from './geolocation-precision.errors';
import { RESULT_COMMENTS } from './geolocation-precision.processor';

const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
const { ACTOR, DROP_OFF, HOMOLOGATION_CONTEXT, PICK_UP } = DocumentEventName;
const { CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
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

const validHomologationDocuments = new Map([
  [
    RECYCLER,
    {
      externalEventsMap: {
        [HOMOLOGATION_CONTEXT]: stubDocumentEvent({
          address: recyclerAddress,
          name: HOMOLOGATION_CONTEXT,
          participant: recyclerParticipant,
        }),
      },
    },
  ],
  [
    WASTE_GENERATOR,
    {
      externalEventsMap: {
        [HOMOLOGATION_CONTEXT]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          name: HOMOLOGATION_CONTEXT,
          participant: wasteGeneratorParticipant,
        }),
      },
    },
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

export const geolocationPrecisionTestCases: {
  actorParticipants: Map<string, MethodologyParticipant>;
  homologationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdDocumentParameters?: StubBoldDocumentParameters | undefined;
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
}[] = [
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [HOMOLOGATION_CONTEXT]: undefined,
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [HOMOLOGATION_CONTEXT]: undefined,
          },
        },
      ],
    ]),
    resultComment: `${RESULT_COMMENTS.MISSING_HOMOLOGATION_ADDRESS(WASTE_GENERATOR)} ${RESULT_COMMENTS.MISSING_HOMOLOGATION_ADDRESS(RECYCLER)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the homologated address is not set',
  },
  {
    actorParticipants,
    homologationDocuments: validHomologationDocuments,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: stubBoldMassIdDropOffEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, nearbyRecyclerAddress.latitude],
            [CAPTURED_GPS_LONGITUDE, nearbyRecyclerAddress.longitude],
          ],
          partialDocumentEvent: {
            address: nearbyRecyclerAddress,
            participant: recyclerParticipant,
          },
        }),
        [PICK_UP]: stubBoldMassIdPickUpEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, nearbyWasteGeneratorAddress.latitude],
            [CAPTURED_GPS_LONGITUDE, nearbyWasteGeneratorAddress.longitude],
          ],
          partialDocumentEvent: {
            address: nearbyWasteGeneratorAddress,
            participant: wasteGeneratorParticipant,
          },
        }),
      },
    },
    resultComment: `${RESULT_COMMENTS.APPROVED_WITH_GPS(WASTE_GENERATOR, nearbyWasteGeneratorAddressDistance, nearbyWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.APPROVED_WITH_GPS(RECYCLER, nearbyRecyclerAddressDistance, nearbyRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the gps is set and both gps geolocation and event address are valid but nearby',
  },
  {
    actorParticipants,
    homologationDocuments: validHomologationDocuments,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: stubBoldMassIdDropOffEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, invalidRecyclerAddress.latitude],
            [CAPTURED_GPS_LONGITUDE, invalidRecyclerAddress.longitude],
          ],
          partialDocumentEvent: {
            address: nearbyRecyclerAddress,
            participant: recyclerParticipant,
          },
        }),
        [PICK_UP]: stubBoldMassIdPickUpEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, invalidWasteGeneratorAddress.latitude],
            [CAPTURED_GPS_LONGITUDE, invalidWasteGeneratorAddress.longitude],
          ],
          partialDocumentEvent: {
            address: nearbyWasteGeneratorAddress,
            participant: wasteGeneratorParticipant,
          },
        }),
      },
    },
    resultComment: `${RESULT_COMMENTS.INVALID_GPS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the address is valid but the gps geolocation is invalid',
  },
  {
    actorParticipants,
    homologationDocuments: validHomologationDocuments,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: stubBoldMassIdDropOffEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, invalidRecyclerAddress.latitude],
            [CAPTURED_GPS_LONGITUDE, invalidRecyclerAddress.longitude],
          ],
          partialDocumentEvent: {
            address: nearbyRecyclerAddress,
            participant: recyclerParticipant,
          },
        }),
        [PICK_UP]: undefined,
      },
    },
    resultComment: RESULT_COMMENTS.INVALID_ACTOR_TYPE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the processor cannot extract the actor type',
  },
  {
    actorParticipants,
    homologationDocuments: validHomologationDocuments,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: stubBoldMassIdDropOffEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, undefined],
            [CAPTURED_GPS_LONGITUDE, undefined],
          ],
          partialDocumentEvent: {
            address: recyclerAddress,
            participant: recyclerParticipant,
          },
        }),
        [PICK_UP]: stubBoldMassIdPickUpEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, undefined],
            [CAPTURED_GPS_LONGITUDE, undefined],
          ],
          partialDocumentEvent: {
            address: wasteGeneratorAddress,
            participant: wasteGeneratorParticipant,
          },
        }),
      },
    },
    resultComment: `${RESULT_COMMENTS.APPROVED_WITHOUT_GPS(WASTE_GENERATOR, 0)} ${RESULT_COMMENTS.APPROVED_WITHOUT_GPS(RECYCLER, 0)}`,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the gps is not set, but the homologated address is set and is valid',
  },
  {
    actorParticipants,
    homologationDocuments: validHomologationDocuments,
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: recyclerActorEvent,
        [`${ACTOR}-${WASTE_GENERATOR}`]: wasteGeneratorActorEvent,
        [DROP_OFF]: stubBoldMassIdDropOffEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, undefined],
            [CAPTURED_GPS_LONGITUDE, undefined],
          ],
          partialDocumentEvent: {
            address: invalidRecyclerAddress,
            participant: recyclerParticipant,
          },
        }),
        [PICK_UP]: stubBoldMassIdPickUpEvent({
          metadataAttributes: [
            [CAPTURED_GPS_LATITUDE, undefined],
            [CAPTURED_GPS_LONGITUDE, undefined],
          ],
          partialDocumentEvent: {
            address: invalidWasteGeneratorAddress,
            participant: wasteGeneratorParticipant,
          },
        }),
      },
    },
    resultComment: `${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)} ${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the gps is not set, but the homologated address is set and not valid',
  },
];

const errorMessage = new GeolocationPrecisionProcessorErrors();

const {
  massIdAuditDocument,
  massIdDocument,
  participantsHomologationDocuments,
} = new BoldStubsBuilder()
  .createMassIdDocuments({
    externalEventsMap: {
      [DROP_OFF]: undefined,
      [PICK_UP]: undefined,
    },
  })
  .createMassIdAuditDocuments()
  .createMethodologyDocument()
  .createParticipantHomologationDocuments()
  .build();

export const geolocationPrecisionErrorTestCases = [
  {
    documents: [
      massIdAuditDocument,
      ...participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment: errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the MassID document does not exist',
  },
  {
    documents: [
      massIdDocument,
      massIdAuditDocument,
      ...participantsHomologationDocuments.values(),
    ],
    massIdAuditDocument,
    resultComment:
      errorMessage.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
        massIdDocument.id,
      ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the MassId document does not contain a DROP_OFF or PICK_UP event',
  },
  {
    documents: [massIdDocument, massIdAuditDocument],
    massIdAuditDocument,
    resultComment:
      errorMessage.ERROR_MESSAGE.PARTICIPANT_HOMOLOGATION_DOCUMENTS_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the homologation documents are not found',
  },
];
