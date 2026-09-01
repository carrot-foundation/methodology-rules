import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubDocumentEvent,
  stubDocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldActorType,
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import type { PrivacyFlagsResultContent } from './privacy-flags.result-content.types';

import { PRIVACY_REASON_CODES } from './privacy-flags.constants';
import { PrivacyFlagsProcessor } from './privacy-flags.processor';
import {
  actorEventKey,
  conformantActorEvent,
  conformantEvent,
  conformantExternalEventsMap,
} from './privacy-flags.test-cases';

const { DESCRIPTION, VEHICLE_LICENSE_PLATE } = BoldAttributeName;
const { ACTOR, DROP_OFF, PICK_UP } = BoldDocumentEventName;
const { AUDITOR, HAULER, INTEGRATOR, PROCESSOR, RECYCLER, WASTE_GENERATOR } =
  BoldActorType;

const METHODOLOGY_PLATFORM_LABEL = 'METHODOLOGY PLATFORM';
const SKIPPED_EVENT_NAME = 'MassID Audit (BOLD Recycling)';
const UNKNOWN_EVENT_NAME = 'Unlisted Event';
const UNKNOWN_ATTRIBUTE_NAME = 'Unlisted Attribute';

const buildMassID = (
  overrides: Record<string, BoldDocumentEvent> = {},
): BoldDocument =>
  new BoldStubsBuilder()
    .createMassIDDocuments({
      externalEventsMap: { ...conformantExternalEventsMap(), ...overrides },
    })
    .build().massIDDocument;

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('PrivacyFlagsProcessor', () => {
  const ruleDataProcessor = new PrivacyFlagsProcessor();
  const documentLoaderService = vi.mocked(loadDocument);

  const evaluate = async (
    massIDDocument: BoldDocument,
  ): Promise<{
    resultComment: string | undefined;
    resultContent: PrivacyFlagsResultContent;
    resultStatus: string;
  }> => {
    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

    return {
      resultComment: ruleOutput.resultComment,
      resultContent: ruleOutput.resultContent as PrivacyFlagsResultContent,
      resultStatus: ruleOutput.resultStatus,
    };
  };

  it('should return PASSED with no review reasons for a conformant document', async () => {
    const { resultComment, resultContent, resultStatus } =
      await evaluate(buildMassID());

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
    expect(resultComment).toBe(
      'All privacy flags match the methodology specification across 11 validated event(s).',
    );
  });

  it('should treat an attribute with the sensitive property omitted as sensitive: false', async () => {
    const pickUpEvent = conformantEvent(PICK_UP);
    const massIDDocument = buildMassID({
      [PICK_UP]: {
        ...pickUpEvent,
        metadata: {
          attributes: (pickUpEvent.metadata?.attributes ?? []).map(
            (attribute) =>
              attribute.name === DESCRIPTION
                ? stubDocumentEventAttribute({
                    isPublic: true,
                    name: DESCRIPTION,
                  })
                : attribute,
          ),
        },
      },
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
  });

  it('should treat a missing externalEvents list as an empty list', async () => {
    const massIDDocument: BoldDocument = {
      ...buildMassID(),
      externalEvents: undefined,
    };

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent).toEqual({ notValidated: [], reviewReasons: [] });
  });

  it('should skip events whose name is in SKIPPED_EVENT_NAMES even when their flags are wrong', async () => {
    const massIDDocument = buildMassID({
      [SKIPPED_EVENT_NAME]: stubDocumentEvent({
        isPublic: false,
        name: SKIPPED_EVENT_NAME,
      }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
    expect(resultContent.notValidated).not.toContainEqual(
      expect.objectContaining({ eventName: SKIPPED_EVENT_NAME }),
    );
  });

  it('should validate preserveSensitiveData on a skipped event used by an assertable participant', async () => {
    const actorEvent = conformantActorEvent(HAULER);
    const massIDDocument = buildMassID({
      [actorEventKey(HAULER)]: actorEvent,
      [SKIPPED_EVENT_NAME]: stubDocumentEvent({
        isPublic: false,
        name: SKIPPED_EVENT_NAME,
        participant: actorEvent.participant,
        preserveSensitiveData: false,
      }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('REVIEW_REQUIRED');
    expect(resultContent.reviewReasons).toContainEqual(
      expect.objectContaining({
        actual: false,
        eventName: SKIPPED_EVENT_NAME,
        expected: true,
        field: 'preserveSensitiveData',
        participantRole: HAULER,
      }),
    );
    expect(resultContent.reviewReasons).not.toContainEqual(
      expect.objectContaining({
        eventName: SKIPPED_EVENT_NAME,
        field: 'isPublic',
      }),
    );
  });

  it('should record notValidated when the event name has no entry in EVENT_PRIVACY_SPEC', async () => {
    const massIDDocument = buildMassID({
      [UNKNOWN_EVENT_NAME]: stubDocumentEvent({
        isPublic: true,
        name: UNKNOWN_EVENT_NAME,
      }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.notValidated).toContainEqual(
      expect.objectContaining({ eventName: UNKNOWN_EVENT_NAME }),
    );
  });

  it('should not validate preserveSensitiveData without a matching assertable participant', async () => {
    const massIDDocument = buildMassID({
      [UNKNOWN_EVENT_NAME]: stubDocumentEvent({
        isPublic: true,
        name: UNKNOWN_EVENT_NAME,
        preserveSensitiveData: true,
      }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).not.toContainEqual(
      expect.objectContaining({ field: 'preserveSensitiveData' }),
    );
  });

  it('should add a review reason when an event isPublic does not match the spec', async () => {
    const massIDDocument = buildMassID({
      [PICK_UP]: { ...conformantEvent(PICK_UP), isPublic: false },
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('REVIEW_REQUIRED');
    expect(resultContent.reviewReasons).toContainEqual(
      expect.objectContaining({
        actual: false,
        code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
        eventName: PICK_UP,
        expected: true,
        field: 'isPublic',
      }),
    );
  });

  it('should skip attribute validation when the event has no metadata', async () => {
    const massIDDocument = buildMassID({
      [DROP_OFF]: stubDocumentEvent({ isPublic: true, name: DROP_OFF }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
  });

  it('should skip attribute validation when the event metadata has no attributes', async () => {
    const massIDDocument = buildMassID({
      [DROP_OFF]: stubDocumentEvent({
        isPublic: true,
        metadata: {},
        name: DROP_OFF,
      }),
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
  });

  it('should record notValidated when an attribute has no entry in the event spec', async () => {
    const pickUpEvent = conformantEvent(PICK_UP);
    const massIDDocument = buildMassID({
      [PICK_UP]: {
        ...pickUpEvent,
        metadata: {
          attributes: [
            ...(pickUpEvent.metadata?.attributes ?? []),
            stubDocumentEventAttribute({
              isPublic: true,
              name: UNKNOWN_ATTRIBUTE_NAME,
            }),
          ],
        },
      },
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.notValidated).toContainEqual(
      expect.objectContaining({
        attributeName: UNKNOWN_ATTRIBUTE_NAME,
        eventName: PICK_UP,
      }),
    );
  });

  it('should add a review reason when an attribute isPublic does not match the spec', async () => {
    const pickUpEvent = conformantEvent(PICK_UP);
    const massIDDocument = buildMassID({
      [PICK_UP]: {
        ...pickUpEvent,
        metadata: {
          attributes: (pickUpEvent.metadata?.attributes ?? []).map(
            (attribute) =>
              attribute.name === DESCRIPTION
                ? { ...attribute, isPublic: false }
                : attribute,
          ),
        },
      },
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('REVIEW_REQUIRED');
    expect(resultContent.reviewReasons).toContainEqual(
      expect.objectContaining({
        actual: false,
        attributeName: DESCRIPTION,
        code: PRIVACY_REASON_CODES.ATTRIBUTE_IS_PUBLIC,
        eventName: PICK_UP,
        expected: true,
        field: 'isPublic',
      }),
    );
  });

  it('should add review reasons when an attribute sensitive flag does not match the spec, in both directions', async () => {
    const pickUpEvent = conformantEvent(PICK_UP);
    const massIDDocument = buildMassID({
      [PICK_UP]: {
        ...pickUpEvent,
        metadata: {
          attributes: (pickUpEvent.metadata?.attributes ?? []).map(
            (attribute) => {
              if (attribute.name === VEHICLE_LICENSE_PLATE) {
                return stubDocumentEventAttribute({
                  isPublic: true,
                  name: VEHICLE_LICENSE_PLATE,
                });
              }

              if (attribute.name === DESCRIPTION) {
                return stubDocumentEventAttribute({
                  isPublic: true,
                  name: DESCRIPTION,
                  sensitive: true,
                });
              }

              return attribute;
            },
          ),
        },
      },
    });

    const { resultContent, resultStatus } = await evaluate(massIDDocument);

    expect(resultStatus).toBe('REVIEW_REQUIRED');
    expect(resultContent.reviewReasons).toContainEqual(
      expect.objectContaining({
        actual: undefined,
        attributeName: VEHICLE_LICENSE_PLATE,
        code: PRIVACY_REASON_CODES.ATTRIBUTE_SENSITIVE,
        eventName: PICK_UP,
        expected: true,
        field: 'sensitive',
      }),
    );
    expect(resultContent.reviewReasons).toContainEqual(
      expect.objectContaining({
        actual: true,
        attributeName: DESCRIPTION,
        code: PRIVACY_REASON_CODES.ATTRIBUTE_SENSITIVE,
        eventName: PICK_UP,
        expected: false,
        field: 'sensitive',
      }),
    );
  });

  describe('ACTOR events', () => {
    it.each([{ label: PROCESSOR }, { label: RECYCLER }])(
      'should add a review reason when the $label actor declares preserveSensitiveData as true',
      async ({ label }) => {
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: stubDocumentEvent({
            isPublic: true,
            label,
            name: ACTOR,
            preserveSensitiveData: true,
          }),
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: true,
            code: 'PRIVACY_ACTOR_PRESERVE_SENSITIVE_DATA',
            eventLabel: label,
            eventName: ACTOR,
            expected: false,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      { expected: true, label: HAULER, preserveSensitiveData: false },
      {
        expected: true,
        label: WASTE_GENERATOR,
        preserveSensitiveData: false,
      },
    ])(
      'should add a review reason when the $label actor declares preserveSensitiveData as $preserveSensitiveData',
      async ({ expected, label, preserveSensitiveData }) => {
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: stubDocumentEvent({
            isPublic: true,
            label,
            name: ACTOR,
            preserveSensitiveData,
          }),
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: preserveSensitiveData,
            eventLabel: label,
            expected,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      { label: HAULER },
      { label: PROCESSOR },
      { label: RECYCLER },
      { label: WASTE_GENERATOR },
    ])(
      'should accept an unspecified preserveSensitiveData value on the $label actor',
      async ({ label }) => {
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: stubDocumentEvent({
            isPublic: true,
            label,
            name: ACTOR,
            preserveSensitiveData: undefined,
          }),
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('PASSED');
        expect(resultContent.reviewReasons).not.toContainEqual(
          expect.objectContaining({
            eventLabel: label,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      { expected: true, label: HAULER, preserveSensitiveData: false },
      { expected: false, label: PROCESSOR, preserveSensitiveData: true },
      { expected: false, label: RECYCLER, preserveSensitiveData: true },
      {
        expected: true,
        label: WASTE_GENERATOR,
        preserveSensitiveData: false,
      },
    ])(
      'should validate preserveSensitiveData on non-Actor events used by the $label participant',
      async ({ expected, label, preserveSensitiveData }) => {
        const actorEvent = conformantActorEvent(label);
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: actorEvent,
          [PICK_UP]: {
            ...conformantEvent(PICK_UP),
            participant: actorEvent.participant,
            preserveSensitiveData,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: preserveSensitiveData,
            code: 'PRIVACY_EVENT_PRESERVE_SENSITIVE_DATA_MISMATCH',
            eventName: PICK_UP,
            expected,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      { label: HAULER },
      { label: PROCESSOR },
      { label: RECYCLER },
      { label: WASTE_GENERATOR },
    ])(
      'should accept an unspecified preserveSensitiveData value on a non-Actor event used by the $label participant',
      async ({ label }) => {
        const actorEvent = conformantActorEvent(label);
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: actorEvent,
          [PICK_UP]: {
            ...conformantEvent(PICK_UP),
            participant: actorEvent.participant,
            preserveSensitiveData: undefined,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('PASSED');
        expect(resultContent.reviewReasons).not.toContainEqual(
          expect.objectContaining({
            eventName: PICK_UP,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      {
        actorRoles: [PROCESSOR, HAULER],
        expectedParticipantRole: PROCESSOR,
        preserveSensitiveData: true,
      },
      {
        actorRoles: [HAULER, PROCESSOR],
        expectedParticipantRole: HAULER,
        preserveSensitiveData: false,
      },
      {
        actorRoles: [HAULER, PROCESSOR],
        expectedParticipantRole: PROCESSOR,
        preserveSensitiveData: true,
      },
      {
        actorRoles: [PROCESSOR, HAULER],
        expectedParticipantRole: HAULER,
        preserveSensitiveData: false,
      },
    ])(
      'should validate a linked event against every participant role when Actor order is $actorRoles',
      async ({
        actorRoles,
        expectedParticipantRole,
        preserveSensitiveData,
      }) => {
        const participant = conformantActorEvent(PROCESSOR).participant;
        const massIDDocument: BoldDocument = {
          ...buildMassID(),
          externalEvents: [
            ...actorRoles.map((label) => ({
              ...conformantActorEvent(label),
              participant,
            })),
            {
              ...conformantEvent(PICK_UP),
              participant,
              preserveSensitiveData,
            },
          ],
        };

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: preserveSensitiveData,
            eventName: PICK_UP,
            field: 'preserveSensitiveData',
            participantRole: expectedParticipantRole,
          }),
        );
      },
    );

    it('should add a review reason when the Processor actor declares isPublic as false', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(PROCESSOR)]: stubDocumentEvent({
          isPublic: false,
          label: PROCESSOR,
          name: ACTOR,
          preserveSensitiveData: false,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons).toContainEqual(
        expect.objectContaining({
          actual: false,
          code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
          eventLabel: PROCESSOR,
          eventName: ACTOR,
          expected: true,
          field: 'isPublic',
        }),
      );
    });

    it('should skip the Integrator and METHODOLOGY PLATFORM labels even with hostile privacy flags, because they are outside the assertable actor allow-list', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(INTEGRATOR)]: stubDocumentEvent({
          isPublic: false,
          label: INTEGRATOR,
          name: ACTOR,
          preserveSensitiveData: true,
        }),
        [actorEventKey(METHODOLOGY_PLATFORM_LABEL)]: stubDocumentEvent({
          isPublic: false,
          label: METHODOLOGY_PLATFORM_LABEL,
          name: ACTOR,
          preserveSensitiveData: true,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
    });

    it("should use an Actor event's own label when the participant also has an assertable Actor role", async () => {
      const processorActorEvent = conformantActorEvent(PROCESSOR);
      const massIDDocument = buildMassID({
        [actorEventKey(INTEGRATOR)]: stubDocumentEvent({
          isPublic: false,
          label: INTEGRATOR,
          name: ACTOR,
          participant: processorActorEvent.participant,
          preserveSensitiveData: true,
        }),
        [actorEventKey(PROCESSOR)]: processorActorEvent,
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).not.toContainEqual(
        expect.objectContaining({
          eventLabel: INTEGRATOR,
          field: 'preserveSensitiveData',
        }),
      );
    });

    it('should skip a BoldActorType label outside the assertable actor allow-list, such as Auditor, even with hostile privacy flags', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(AUDITOR)]: stubDocumentEvent({
          isPublic: false,
          label: AUDITOR,
          name: ACTOR,
          preserveSensitiveData: true,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).not.toContainEqual(
        expect.objectContaining({ eventLabel: AUDITOR }),
      );
    });

    it('should skip an ACTOR event with no label even when isPublic is false', async () => {
      const massIDDocument = buildMassID({
        'ACTOR-unlabeled': stubDocumentEvent({
          isPublic: false,
          name: ACTOR,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
    });
  });
});
