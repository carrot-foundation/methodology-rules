import type { MethodologyParticipant } from '@carrot-fndn/shared/types';

import { calculateDistance } from '@carrot-fndn/shared/helpers';
import {
  ACTOR_PARTICIPANTS,
  type StubBoldDocumentParameters,
  generateNearbyCoordinates,
  stubAddress,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventName,
  MassIdDocumentActorType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import { RESULT_COMMENTS } from './geolocation-precision.processor';

const { RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;
const { ACTOR, DROP_OFF, OPEN, PICK_UP } = DocumentEventName;
const { CAPTURED_GPS_LATITUDE, CAPTURED_GPS_LONGITUDE } =
  NewDocumentEventAttributeName;

const actorParticipants = new Map(
  ACTOR_PARTICIPANTS.map((subtype) => [
    subtype,
    stubParticipant({ id: faker.string.uuid(), type: subtype }),
  ]),
);
const actorsCoordinates = new Map(
  ACTOR_PARTICIPANTS.map((subtype) => [subtype, generateNearbyCoordinates()]),
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
const invalidRecyclerAddress = stubAddress();
const invalidWasteGeneratorAddress = stubAddress();
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

export const geolocationPrecisionTestCases: {
  actorParticipants?: Map<string, MethodologyParticipant> | undefined;
  homologationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdDocumentParameters?: StubBoldDocumentParameters | undefined;
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
}[] = [
  {
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: undefined,
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: undefined,
          },
        },
      ],
    ]),
    resultComment: `${RESULT_COMMENTS.MISSING_HOMOLOGATION_ADDRESS(RECYCLER)} ${RESULT_COMMENTS.MISSING_HOMOLOGATION_ADDRESS(WASTE_GENERATOR)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the homologated address is not set',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: recyclerAddress,
              name: OPEN,
              participant: recyclerParticipant,
            }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: wasteGeneratorAddress,
              name: OPEN,
              participant: wasteGeneratorParticipant,
            }),
          },
        },
      ],
    ]),
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: recyclerAddress,
          label: RECYCLER,
          name: ACTOR,
          participant: recyclerParticipant,
        }),
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: wasteGeneratorParticipant,
        }),
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
    resultComment: `${RESULT_COMMENTS.APPROVED_WITHOUT_GPS(RECYCLER, 0)} ${RESULT_COMMENTS.APPROVED_WITHOUT_GPS(WASTE_GENERATOR, 0)}`,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the gps is not set, but the homologated address is set and is valid',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: recyclerAddress,
              name: OPEN,
              participant: recyclerParticipant,
            }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: wasteGeneratorAddress,
              name: OPEN,
              participant: wasteGeneratorParticipant,
            }),
          },
        },
      ],
    ]),
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: recyclerAddress,
          label: RECYCLER,
          name: ACTOR,
          participant: recyclerParticipant,
        }),
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: wasteGeneratorParticipant,
        }),
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
    resultComment: `${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)} ${RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario:
      'the gps is not set, but the homologated address is set and not valid',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: recyclerAddress,
              name: OPEN,
              participant: recyclerParticipant,
            }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: wasteGeneratorAddress,
              name: OPEN,
              participant: wasteGeneratorParticipant,
            }),
          },
        },
      ],
    ]),
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: recyclerAddress,
          label: RECYCLER,
          name: ACTOR,
          participant: recyclerParticipant,
        }),
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: wasteGeneratorParticipant,
        }),
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
    resultComment: `${RESULT_COMMENTS.APPROVED_WITH_GPS(RECYCLER, nearbyRecyclerAddressDistance, nearbyRecyclerAddressDistance)} ${RESULT_COMMENTS.APPROVED_WITH_GPS(WASTE_GENERATOR, nearbyWasteGeneratorAddressDistance, nearbyWasteGeneratorAddressDistance)}`,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario:
      'the gps is set and both gps geolocation and event address are invalid',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: recyclerAddress,
              name: OPEN,
              participant: recyclerParticipant,
            }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: wasteGeneratorAddress,
              name: OPEN,
              participant: wasteGeneratorParticipant,
            }),
          },
        },
      ],
    ]),
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: recyclerAddress,
          label: RECYCLER,
          name: ACTOR,
          participant: recyclerParticipant,
        }),
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: wasteGeneratorParticipant,
        }),
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
    resultComment: `${RESULT_COMMENTS.INVALID_GPS_DISTANCE(RECYCLER, invalidRecyclerAddressDistance)} ${RESULT_COMMENTS.INVALID_GPS_DISTANCE(WASTE_GENERATOR, invalidWasteGeneratorAddressDistance)}`,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'the address is valid but the gps geolocation is invalid',
  },
  {
    actorParticipants,
    homologationDocuments: new Map([
      [
        RECYCLER,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: recyclerAddress,
              name: OPEN,
              participant: recyclerParticipant,
            }),
          },
        },
      ],
      [
        WASTE_GENERATOR,
        {
          externalEventsMap: {
            [OPEN]: stubDocumentEvent({
              address: wasteGeneratorAddress,
              name: OPEN,
              participant: wasteGeneratorParticipant,
            }),
          },
        },
      ],
    ]),
    massIdDocumentParameters: {
      externalEventsMap: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: recyclerAddress,
          label: RECYCLER,
          name: ACTOR,
          participant: recyclerParticipant,
        }),
        [`${ACTOR}-${WASTE_GENERATOR}`]: stubDocumentEvent({
          address: wasteGeneratorAddress,
          label: WASTE_GENERATOR,
          name: ACTOR,
          participant: wasteGeneratorParticipant,
        }),
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
];
