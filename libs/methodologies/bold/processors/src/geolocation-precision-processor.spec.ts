import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubAddress,
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassDocument,
  stubMassValidationDocument,
  stubMethodologyDefinitionDocument,
  stubParticipantHomologationDocument,
  stubParticipantHomologationGroupDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { formatDate } from 'date-fns';
import { random } from 'typia';

import { GeolocationPrecisionRuleProcessor } from './geolocation-precision-processor';

const { CLOSE, MOVE, OPEN } = DocumentEventName;
const { HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;

class TestGeolocationPrecisionRuleProcessor extends GeolocationPrecisionRuleProcessor {
  protected override moveTypeValue = DocumentEventMoveType.PICK_UP;

  protected participantHomologationSubtype = DocumentSubtype.SOURCE;
}

const ruleDataProcessor: TestGeolocationPrecisionRuleProcessor =
  new TestGeolocationPrecisionRuleProcessor();

describe('GeolocationPrecisionRuleProcessor', () => {
  const massValidationId = faker.string.uuid();
  const massReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.ORGANIC,
  };

  const massValidationReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massValidationId,
    subtype: DocumentSubtype.PROCESS,
    type: DocumentType.MASS_VALIDATION,
  };

  const methodologyReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.DEFINITION,
  };

  const participantHomologationGroupReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  };

  const recyclerHomologationReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.SOURCE,
    type: DocumentType.PARTICIPANT_HOMOLOGATION,
  };

  const pickUpEvent = stubDocumentEvent({
    address: {
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
    },
    metadata: {
      attributes: [
        {
          isPublic: faker.datatype.boolean(),
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DocumentEventMoveType.PICK_UP,
        },
      ],
    },
    name: random<typeof MOVE | typeof OPEN>(),
  });
  const homologationCloseEvent = stubDocumentEventWithMetadataAttributes(
    { name: CLOSE },
    [[HOMOLOGATION_DUE_DATE, formatDate(faker.date.future(), 'yyyy/MM/dd')]],
  );
  const massDocumentStub = stubMassDocument({
    externalEvents: [
      pickUpEvent,
      stubDocumentEvent({
        name: DocumentEventName.OUTPUT,
        relatedDocument: massValidationReference,
      }),
    ],
    id: massReference.documentId,
  });
  const massValidationDocumentStub = stubMassValidationDocument({
    externalEvents: [
      stubDocumentEvent({
        name: DocumentEventName.ACTOR,
        referencedDocument: methodologyReference,
      }),
    ],
    id: massValidationReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });
  const methodologyDocumentStub = stubMethodologyDefinitionDocument({
    externalEvents: [
      stubDocumentEvent({
        name: DocumentEventName.OUTPUT,
        relatedDocument: participantHomologationGroupReference,
      }),
    ],
    id: methodologyReference.documentId,
  });
  const participantHomologationGroupDocumentStub =
    stubParticipantHomologationGroupDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.OUTPUT,
          relatedDocument: recyclerHomologationReference,
        }),
      ],
      id: participantHomologationGroupReference.documentId,
      parentDocumentId: methodologyDocumentStub.id,
    });
  const recyclerHomologationDocumentStub = stubParticipantHomologationDocument({
    externalEvents: [
      stubDocumentEvent({
        address: pickUpEvent.address,
        name: DocumentEventName.OPEN,
        participant: pickUpEvent.participant,
      }),
      homologationCloseEvent,
    ],
    id: participantHomologationGroupReference.documentId,
    parentDocumentId: participantHomologationGroupReference.documentId,
    subtype: DocumentSubtype.RECYCLER,
  });

  it.each([
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [],
        },
      ],
      resultComment: ruleDataProcessor['ResultComment'].EVENT_NOT_FOUND,
      scenario:
        'should return APPROVED when the DROP_OFF event in mass document is not found',
    },
    {
      documents: [massDocumentStub],
      scenario:
        'should return APPROVED when the homologation address is equal and the geolocation precision is valid',
    },
  ])('$scenario', async ({ documents, resultComment }) => {
    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massValidationDocumentStub,
      methodologyDocumentStub,
      participantHomologationGroupDocumentStub,
      recyclerHomologationDocumentStub,
      ...documents,
    ]);

    const ruleInput = {
      ...random<Required<RuleInput>>(),
      documentId: massValidationId,
    };

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it.each([
    {
      documents: [],
      resultComment:
        ruleDataProcessor['ResultComment'].HOMOLOGATION_DOCUMENT_NOT_FOUND,
      scenario:
        'should return REJECTED when the homologation document is not found',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: stubArray(stubDocumentEvent),
        },
      ],
      resultComment:
        ruleDataProcessor['ResultComment'].HOMOLOGATION_DOCUMENT_NOT_FOUND,
      scenario:
        'should return REJECTED when the homologation document is not found',
    },
    {
      documents: [
        massDocumentStub,
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            {
              ...stubDocumentEvent({
                name: DocumentEventName.OPEN,
                participant: pickUpEvent.participant,
              }),
              address: undefined,
            },
            homologationCloseEvent,
          ],
        },
      ],
      resultComment:
        ruleDataProcessor['ResultComment'].HOMOLOGATION_ADDRESS_NOT_FOUND,
      scenario:
        'should return REJECTED when the homologation document does not have the OPEN address',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            stubDocumentEvent({
              address: pickUpEvent.address,
              name: DocumentEventName.OPEN,
            }),
            homologationCloseEvent,
          ],
        },
      ],
      resultComment:
        ruleDataProcessor['ResultComment'].HOMOLOGATION_DOCUMENT_NOT_FOUND,
      scenario:
        'should return REJECTED when the homologation document participant is different from the mass document participant',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            stubDocumentEvent({
              ...pickUpEvent,
              name: DocumentEventName.OPEN,
            }),
            stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
              [HOMOLOGATION_DUE_DATE, ''],
            ]),
          ],
        },
      ],
      resultComment: ruleDataProcessor['ResultComment'].HOMOLOGATION_EXPIRED,
      scenario:
        'should return REJECTED when the homologation-due-date is a empty string',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            stubDocumentEvent({
              ...pickUpEvent,
              name: DocumentEventName.OPEN,
            }),
            stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
              [HOMOLOGATION_DUE_DATE, '1990/01/01'],
            ]),
          ],
        },
      ],
      resultComment: ruleDataProcessor['ResultComment'].HOMOLOGATION_EXPIRED,
      scenario:
        'should return REJECTED when the homologation due date is expired',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            stubDocumentEvent({
              address: stubAddress(),
              name: DocumentEventName.OPEN,
              participant: pickUpEvent.participant,
            }),
            homologationCloseEvent,
          ],
        },
      ],
      resultComment: undefined,
      scenario:
        'should return REJECTED when the homologation address is different from the mass document address',
    },
    {
      documents: [
        {
          ...recyclerHomologationDocumentStub,
          externalEvents: [
            stubDocumentEvent({
              address: {
                ...pickUpEvent.address,
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
              },
              name: DocumentEventName.OPEN,
              participant: pickUpEvent.participant,
            }),
            homologationCloseEvent,
          ],
        },
      ],
      resultComment: undefined,
      scenario:
        'should return REJECTED when the homologation address is equal but the distance is greater than 2',
    },
  ])('$scenario', async ({ documents, resultComment }) => {
    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massDocumentStub,
      massValidationDocumentStub,
      methodologyDocumentStub,
      participantHomologationGroupDocumentStub,
      // @ts-expect-error: to allow address to be undefined
      ...documents,
    ]);

    const ruleInput = {
      ...random<Required<RuleInput>>(),
      documentId: massValidationId,
    };

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
