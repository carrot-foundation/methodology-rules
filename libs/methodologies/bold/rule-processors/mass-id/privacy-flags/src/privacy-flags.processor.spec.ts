import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
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
import { type RuleFinding } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import type { PrivacyFlagsResultContent } from './privacy-flags.result-content.types';

import {
  LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME,
  PRIVACY_REASON_CODES,
} from './privacy-flags.constants';
import { PRIVACY_FLAGS_FINDINGS } from './privacy-flags.findings';
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
const WASTE_MANAGER_LABEL = 'Waste Manager';
const SKIPPED_EVENT_NAME = 'MassID Audit (BOLD Recycling)';
const UNKNOWN_EVENT_NAME = 'Unlisted Event';
const UNKNOWN_ATTRIBUTE_NAME = 'Unlisted Attribute';

const legacyActorEvent = (
  actorType: number | string,
  overrides: Partial<BoldDocumentEvent> = {},
): BoldDocumentEvent =>
  stubDocumentEvent({
    isPublic: true,
    metadata: {
      attributes: [
        stubDocumentEventAttribute({
          isPublic: false,
          name: LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME,
          value: actorType,
        }),
      ],
    },
    name: ACTOR,
    ...overrides,
  });

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
    findings: RuleFinding[] | undefined;
    resultComment: string | undefined;
    resultContent: PrivacyFlagsResultContent;
    resultStatus: string;
  }> => {
    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());
    const { resultComment, resultContent, resultStatus } = expectRuleFindings(
      ruleOutput,
      PRIVACY_FLAGS_FINDINGS,
    );

    return {
      findings: ruleOutput.resultContent?.['findings'],
      resultComment,
      resultContent: resultContent as PrivacyFlagsResultContent,
      resultStatus,
    };
  };

  it('should return PASSED with no review reasons for a conformant document', async () => {
    const { resultComment, resultContent, resultStatus } =
      await evaluate(buildMassID());

    expect(resultStatus).toBe('PASSED');
    expect(resultContent.reviewReasons).toEqual([]);
    expect(resultComment).toBe(
      'All privacy flags match the methodology specification across 14 validated event(s).',
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

    const { findings, resultContent, resultStatus } =
      await evaluate(massIDDocument);

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
    expect(findings).toEqual([
      PRIVACY_FLAGS_FINDINGS.finding('REVIEW_REQUIRED.EVENT_IS_PUBLIC'),
    ]);
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

    const { findings, resultContent, resultStatus } =
      await evaluate(massIDDocument);

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
    expect(findings).toEqual([
      PRIVACY_FLAGS_FINDINGS.finding('REVIEW_REQUIRED.ATTRIBUTE_IS_PUBLIC'),
    ]);
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

    const { findings, resultContent, resultStatus } =
      await evaluate(massIDDocument);

    expect(resultStatus).toBe('REVIEW_REQUIRED');
    expect(findings).toEqual([
      PRIVACY_FLAGS_FINDINGS.finding('REVIEW_REQUIRED.ATTRIBUTE_SENSITIVE'),
      PRIVACY_FLAGS_FINDINGS.finding('REVIEW_REQUIRED.ATTRIBUTE_SENSITIVE'),
    ]);
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

        const { findings, resultContent, resultStatus } =
          await evaluate(massIDDocument);

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
        expect(findings).toEqual([
          PRIVACY_FLAGS_FINDINGS.finding(
            'REVIEW_REQUIRED.EVENT_PRESERVE_SENSITIVE_DATA',
          ),
        ]);
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

    it.each([{ label: INTEGRATOR }, { label: PROCESSOR }, { label: RECYCLER }])(
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

        const { findings, resultContent, resultStatus } =
          await evaluate(massIDDocument);

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
        expect(findings).toEqual([
          PRIVACY_FLAGS_FINDINGS.finding(
            'REVIEW_REQUIRED.EVENT_PRESERVE_SENSITIVE_DATA',
          ),
        ]);
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

    it('should report the ACTOR_IS_PUBLIC finding for an actor isPublic violation even though its review reason carries the EVENT_IS_PUBLIC code', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(PROCESSOR)]: {
          ...conformantActorEvent(PROCESSOR),
          isPublic: false,
        },
      });

      const { findings, resultContent, resultStatus } =
        await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons.map(({ code }) => code)).toEqual([
        PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
      ]);
      expect(findings).toEqual([
        PRIVACY_FLAGS_FINDINGS.finding('REVIEW_REQUIRED.ACTOR_IS_PUBLIC'),
      ]);
    });

    it('should add a review reason when the Integrator actor declares isPublic as false', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(INTEGRATOR)]: stubDocumentEvent({
          isPublic: false,
          label: INTEGRATOR,
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
          eventLabel: INTEGRATOR,
          eventName: ACTOR,
          expected: true,
          field: 'isPublic',
        }),
      );
    });

    it('should skip the METHODOLOGY PLATFORM label even with hostile privacy flags, because it is outside the assertable actor allow-list', async () => {
      const massIDDocument = buildMassID({
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
        [actorEventKey(AUDITOR)]: stubDocumentEvent({
          isPublic: false,
          label: AUDITOR,
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
          eventLabel: AUDITOR,
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

    it.each([{ label: HAULER }, { label: WASTE_GENERATOR }])(
      'should add a review reason when the $label participant never declares preserveSensitiveData',
      async ({ label }) => {
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: stubDocumentEvent({
            isPublic: true,
            label,
            name: ACTOR,
            preserveSensitiveData: undefined,
          }),
        });

        const { findings, resultContent, resultStatus } =
          await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: undefined,
            code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
            eventLabel: label,
            eventName: ACTOR,
            expected: true,
            field: 'preserveSensitiveData',
            participantRole: label,
          }),
        );
        expect(findings).toEqual([
          PRIVACY_FLAGS_FINDINGS.finding(
            'REVIEW_REQUIRED.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING',
          ),
        ]);
      },
    );

    it('should raise one missing-flag reason for a Hauler that is also an Auditor, naming only the Hauler role', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const massIDDocument = buildMassID({
        [actorEventKey(AUDITOR)]: stubDocumentEvent({
          isPublic: true,
          label: AUDITOR,
          name: ACTOR,
          participant: haulerActorEvent.participant,
          preserveSensitiveData: undefined,
        }),
        [actorEventKey(HAULER)]: {
          ...haulerActorEvent,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(
        resultContent.reviewReasons.filter(
          ({ code }) =>
            code ===
            PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
        ),
      ).toEqual([
        expect.objectContaining({
          eventLabel: HAULER,
          participantRole: HAULER,
        }),
      ]);
    });

    it('should flag an undeclared Waste Generator even when its Recycler role declares preserveSensitiveData as false', async () => {
      const wasteGeneratorActorEvent = conformantActorEvent(WASTE_GENERATOR);
      const massIDDocument = buildMassID({
        [actorEventKey(RECYCLER)]: {
          ...conformantActorEvent(RECYCLER),
          participant: wasteGeneratorActorEvent.participant,
          preserveSensitiveData: false,
        },
        [actorEventKey(WASTE_GENERATOR)]: {
          ...wasteGeneratorActorEvent,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(
        resultContent.reviewReasons.filter(
          ({ field }) => field === 'preserveSensitiveData',
        ),
      ).toEqual([
        expect.objectContaining({
          code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
          expected: true,
          participantRole: WASTE_GENERATOR,
        }),
      ]);
    });

    it('should raise exactly one reason for a Waste Generator that declares preserveSensitiveData as false', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(WASTE_GENERATOR)]: stubDocumentEvent({
          isPublic: true,
          label: WASTE_GENERATOR,
          name: ACTOR,
          preserveSensitiveData: false,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(
        resultContent.reviewReasons.filter(
          ({ field }) => field === 'preserveSensitiveData',
        ),
      ).toEqual([
        expect.objectContaining({
          actual: false,
          code: PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA,
          expected: true,
          participantRole: WASTE_GENERATOR,
        }),
      ]);
    });

    it('should accept a Hauler that never declares preserveSensitiveData when it is also a Recycler', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const massIDDocument = buildMassID({
        [actorEventKey(HAULER)]: {
          ...haulerActorEvent,
          preserveSensitiveData: undefined,
        },
        [actorEventKey(RECYCLER)]: {
          ...conformantActorEvent(RECYCLER),
          participant: haulerActorEvent.participant,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
    });

    it('should pass a Recycler and Processor that also hauls and flags its Hauler Actor event as private', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const { participant } = haulerActorEvent;
      const massIDDocument = buildMassID({
        [actorEventKey(HAULER)]: haulerActorEvent,
        [actorEventKey(PROCESSOR)]: {
          ...conformantActorEvent(PROCESSOR),
          participant,
        },
        [actorEventKey(RECYCLER)]: {
          ...conformantActorEvent(RECYCLER),
          participant,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
    });

    it.each([{ publicRole: RECYCLER }, { publicRole: PROCESSOR }])(
      'should set a Hauler-only true flag aside when the participant is also a $publicRole on a public Actor event, so an undeclared Waste Manager role is not required to declare',
      async ({ publicRole }) => {
        const haulerActorEvent = conformantActorEvent(HAULER);
        const { participant } = haulerActorEvent;
        const massIDDocument = buildMassID({
          [actorEventKey(HAULER)]: haulerActorEvent,
          [actorEventKey(publicRole)]: {
            ...conformantActorEvent(publicRole),
            participant,
          },
          [actorEventKey(WASTE_MANAGER_LABEL)]: {
            ...conformantActorEvent(WASTE_MANAGER_LABEL),
            participant,
            preserveSensitiveData: undefined,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('PASSED');
        expect(resultContent.reviewReasons).toEqual([]);
      },
    );

    it.each([{ publicRole: RECYCLER }, { publicRole: PROCESSOR }])(
      'should keep a Hauler-only true flag when the $publicRole Actor event is not public, even though a public non-Actor event of the participant carries that role',
      async ({ publicRole }) => {
        const haulerActorEvent = conformantActorEvent(HAULER);
        const { participant } = haulerActorEvent;
        const massIDDocument = buildMassID({
          [actorEventKey(HAULER)]: haulerActorEvent,
          [actorEventKey(publicRole)]: {
            ...conformantActorEvent(publicRole),
            isPublic: false,
            participant,
          },
          [actorEventKey(WASTE_MANAGER_LABEL)]: {
            ...conformantActorEvent(WASTE_MANAGER_LABEL),
            participant,
            preserveSensitiveData: undefined,
          },
          [PICK_UP]: {
            ...conformantEvent(PICK_UP),
            label: publicRole,
            participant,
            preserveSensitiveData: undefined,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toEqual([
          expect.objectContaining({
            code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
            eventLabel: publicRole,
          }),
          expect.objectContaining({
            code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
            participantRole: WASTE_MANAGER_LABEL,
          }),
        ]);
      },
    );

    it('should keep a Hauler-only true flag when the only public Actor event naming no role of its own inherits a Recycler role held on a private event', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const { participant } = haulerActorEvent;
      const massIDDocument = buildMassID({
        'ACTOR-legacy-recycler': legacyActorEvent('RECYCLER', {
          isPublic: false,
          participant,
          preserveSensitiveData: undefined,
        }),
        'ACTOR-legacy-unknown': legacyActorEvent(1, {
          participant,
          preserveSensitiveData: undefined,
        }),
        [actorEventKey(HAULER)]: haulerActorEvent,
        [actorEventKey(WASTE_MANAGER_LABEL)]: {
          ...conformantActorEvent(WASTE_MANAGER_LABEL),
          participant,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons).toEqual([
        expect.objectContaining({
          code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
          participantRole: WASTE_MANAGER_LABEL,
        }),
      ]);
    });

    it.each([
      {
        attributeIsPublic: false,
        expectedReasons: [
          expect.objectContaining({
            code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
            participantRole: WASTE_MANAGER_LABEL,
          }),
        ],
        expectedStatus: 'REVIEW_REQUIRED',
        outcome: 'keep',
      },
      {
        attributeIsPublic: true,
        expectedReasons: [],
        expectedStatus: 'PASSED',
        outcome: 'set aside',
      },
    ])(
      'should $outcome a Hauler-only true flag when a public Actor event reads Recycler only from an actor-type attribute whose isPublic is $attributeIsPublic',
      async ({ attributeIsPublic, expectedReasons, expectedStatus }) => {
        const haulerActorEvent = conformantActorEvent(HAULER);
        const { participant } = haulerActorEvent;
        const massIDDocument = buildMassID({
          'ACTOR-legacy-recycler': legacyActorEvent('RECYCLER', {
            metadata: {
              attributes: [
                stubDocumentEventAttribute({
                  isPublic: attributeIsPublic,
                  name: LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME,
                  value: 'RECYCLER',
                }),
              ],
            },
            participant,
            preserveSensitiveData: undefined,
          }),
          [actorEventKey(HAULER)]: haulerActorEvent,
          [actorEventKey(WASTE_MANAGER_LABEL)]: {
            ...conformantActorEvent(WASTE_MANAGER_LABEL),
            participant,
            preserveSensitiveData: undefined,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe(expectedStatus);
        expect(resultContent.reviewReasons).toEqual(expectedReasons);
      },
    );

    it('should treat an Actor event read as Hauler only through actor-type as Hauler-only even when its label names no spec role', async () => {
      const recyclerActorEvent = conformantActorEvent(RECYCLER);
      const { participant } = recyclerActorEvent;
      const massIDDocument = buildMassID({
        [actorEventKey(AUDITOR)]: legacyActorEvent('HAULER', {
          label: AUDITOR,
          participant,
          preserveSensitiveData: true,
        }),
        [actorEventKey(RECYCLER)]: recyclerActorEvent,
        [actorEventKey(WASTE_MANAGER_LABEL)]: {
          ...conformantActorEvent(WASTE_MANAGER_LABEL),
          participant,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
    });

    it('should review a true flag on a non-Actor event of a Hauler that is also a Recycler, because the event carries every role and the Recycler default is false', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const { participant } = haulerActorEvent;
      const massIDDocument = buildMassID({
        [actorEventKey(HAULER)]: haulerActorEvent,
        [actorEventKey(RECYCLER)]: {
          ...conformantActorEvent(RECYCLER),
          participant,
        },
        [PICK_UP]: {
          ...conformantEvent(PICK_UP),
          participant,
          preserveSensitiveData: true,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons).toEqual([
        expect.objectContaining({
          code: PRIVACY_REASON_CODES.EVENT_PRESERVE_SENSITIVE_DATA,
          eventName: PICK_UP,
          participantRole: RECYCLER,
        }),
      ]);
    });

    it('should keep a Hauler true flag when the participant holds no Recycler or Processor role, so an undeclared Waste Manager role must declare', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const { participant } = haulerActorEvent;
      const massIDDocument = buildMassID({
        [actorEventKey(HAULER)]: haulerActorEvent,
        [actorEventKey(INTEGRATOR)]: {
          ...conformantActorEvent(INTEGRATOR),
          participant,
        },
        [actorEventKey(WASTE_MANAGER_LABEL)]: {
          ...conformantActorEvent(WASTE_MANAGER_LABEL),
          participant,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons).toEqual([
        expect.objectContaining({
          code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
          participantRole: WASTE_MANAGER_LABEL,
        }),
      ]);
    });

    it('should add a review reason when the Integrator actor declares preserveSensitiveData as true', async () => {
      const massIDDocument = buildMassID({
        [actorEventKey(INTEGRATOR)]: stubDocumentEvent({
          isPublic: true,
          label: INTEGRATOR,
          name: ACTOR,
          preserveSensitiveData: true,
        }),
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('REVIEW_REQUIRED');
      expect(resultContent.reviewReasons).toContainEqual(
        expect.objectContaining({
          actual: true,
          code: PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA,
          eventLabel: INTEGRATOR,
          eventName: ACTOR,
          expected: false,
          field: 'preserveSensitiveData',
        }),
      );
    });

    it.each([{ label: HAULER }, { label: WASTE_GENERATOR }])(
      'should validate an unlabeled ACTOR event declaring preserveSensitiveData as false against the $label role it belongs to',
      async ({ label }) => {
        const actorEvent = conformantActorEvent(label);
        const massIDDocument = buildMassID({
          'ACTOR-unlabeled': stubDocumentEvent({
            isPublic: true,
            name: ACTOR,
            participant: actorEvent.participant,
            preserveSensitiveData: false,
          }),
          [actorEventKey(label)]: {
            ...actorEvent,
            preserveSensitiveData: undefined,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toContainEqual(
          expect.objectContaining({
            actual: false,
            code: PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA,
            eventName: ACTOR,
            expected: true,
            field: 'preserveSensitiveData',
            participantRole: label,
          }),
        );
      },
    );

    it('should collect preserveSensitiveData from an unlabeled ACTOR event of the same participant', async () => {
      const haulerActorEvent = conformantActorEvent(HAULER);
      const massIDDocument = buildMassID({
        'ACTOR-unlabeled': stubDocumentEvent({
          isPublic: true,
          name: ACTOR,
          participant: haulerActorEvent.participant,
          preserveSensitiveData: true,
        }),
        [actorEventKey(HAULER)]: {
          ...haulerActorEvent,
          preserveSensitiveData: undefined,
        },
      });

      const { resultContent, resultStatus } = await evaluate(massIDDocument);

      expect(resultStatus).toBe('PASSED');
      expect(resultContent.reviewReasons).toEqual([]);
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

    describe('legacy actor-type attribute', () => {
      it.each([
        { actorType: 'HAULER', expectedRole: HAULER },
        { actorType: 'SOURCE', expectedRole: WASTE_GENERATOR },
      ])(
        'should read the $expectedRole role from an unlabeled ACTOR event with actor-type $actorType declaring preserveSensitiveData as false',
        async ({ actorType, expectedRole }) => {
          const massIDDocument = buildMassID({
            'ACTOR-legacy': legacyActorEvent(actorType, {
              preserveSensitiveData: false,
            }),
          });

          const { resultContent, resultStatus } =
            await evaluate(massIDDocument);

          expect(resultStatus).toBe('REVIEW_REQUIRED');
          expect(
            resultContent.reviewReasons.filter(
              ({ participantRole }) => participantRole === expectedRole,
            ),
          ).toEqual([
            expect.objectContaining({
              actual: false,
              code: PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA,
              eventName: ACTOR,
              expected: true,
              field: 'preserveSensitiveData',
            }),
          ]);
        },
      );

      it('should require a declaration from a legacy Waste Generator that omits preserveSensitiveData', async () => {
        const massIDDocument = buildMassID({
          'ACTOR-legacy': legacyActorEvent('SOURCE', {
            preserveSensitiveData: undefined,
          }),
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toEqual([
          expect.objectContaining({
            code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
            participantRole: WASTE_GENERATOR,
          }),
        ]);
      });

      it('should validate non-Actor events against the role read from actor-type', async () => {
        const actorEvent = legacyActorEvent('HAULER', {
          preserveSensitiveData: true,
        });
        const massIDDocument = buildMassID({
          'ACTOR-legacy': actorEvent,
          [PICK_UP]: {
            ...conformantEvent(PICK_UP),
            participant: actorEvent.participant,
            preserveSensitiveData: false,
          },
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toEqual([
          expect.objectContaining({
            actual: false,
            code: PRIVACY_REASON_CODES.EVENT_PRESERVE_SENSITIVE_DATA,
            eventName: PICK_UP,
            expected: true,
            participantRole: HAULER,
          }),
        ]);
      });

      it('should hold both the label role and the actor-type role of one ACTOR event', async () => {
        const massIDDocument = buildMassID({
          [actorEventKey(RECYCLER)]: legacyActorEvent('SOURCE', {
            label: RECYCLER,
            preserveSensitiveData: false,
          }),
        });

        const { resultContent, resultStatus } = await evaluate(massIDDocument);

        expect(resultStatus).toBe('REVIEW_REQUIRED');
        expect(resultContent.reviewReasons).toEqual([
          expect.objectContaining({
            actual: false,
            eventLabel: RECYCLER,
            expected: true,
            participantRole: WASTE_GENERATOR,
          }),
        ]);
      });

      it.each([{ actorType: 'AUDITOR' }, { actorType: 1 }])(
        'should read no role from the actor-type value $actorType outside the legacy vocabulary',
        async ({ actorType }) => {
          const massIDDocument = buildMassID({
            'ACTOR-legacy': legacyActorEvent(actorType, {
              preserveSensitiveData: undefined,
            }),
          });

          const { resultContent, resultStatus } =
            await evaluate(massIDDocument);

          expect(resultStatus).toBe('PASSED');
          expect(resultContent.reviewReasons).toEqual([]);
        },
      );
    });
  });
});
