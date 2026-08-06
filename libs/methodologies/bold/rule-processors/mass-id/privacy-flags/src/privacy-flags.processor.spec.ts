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
  conformantEvent,
  conformantExternalEventsMap,
} from './privacy-flags.test-cases';

const { DESCRIPTION, VEHICLE_LICENSE_PLATE } = BoldAttributeName;
const { ACTOR, DROP_OFF, PICK_UP } = BoldDocumentEventName;
const { HAULER, INTEGRATOR, PROCESSOR, RECYCLER, WASTE_GENERATOR } =
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
    resultContent: PrivacyFlagsResultContent;
    resultStatus: string;
  }> => {
    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

    return {
      resultContent: ruleOutput.resultContent as PrivacyFlagsResultContent,
      resultStatus: ruleOutput.resultStatus,
    };
  };

  it('should return PASSED with no review reasons for a conformant document', async () => {
    const { resultContent, resultStatus } = await evaluate(buildMassID());

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
            code: PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA,
            eventLabel: label,
            eventName: ACTOR,
            expected: false,
            field: 'preserveSensitiveData',
          }),
        );
      },
    );

    it.each([
      { label: HAULER, preserveSensitiveData: true },
      { label: HAULER, preserveSensitiveData: false },
      { label: HAULER, preserveSensitiveData: undefined },
      { label: WASTE_GENERATOR, preserveSensitiveData: true },
      { label: WASTE_GENERATOR, preserveSensitiveData: false },
      { label: WASTE_GENERATOR, preserveSensitiveData: undefined },
    ])(
      'should not add a preserveSensitiveData review reason for the $label actor when preserveSensitiveData is $preserveSensitiveData',
      async ({ label, preserveSensitiveData }) => {
        const massIDDocument = buildMassID({
          [actorEventKey(label)]: stubDocumentEvent({
            isPublic: true,
            label,
            name: ACTOR,
            preserveSensitiveData,
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

    it('should skip the Integrator and METHODOLOGY PLATFORM actors even with hostile privacy flags', async () => {
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
      expect(resultContent.notValidated).not.toContainEqual(
        expect.objectContaining({ eventName: ACTOR }),
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
      expect(resultContent.notValidated).not.toContainEqual(
        expect.objectContaining({ eventName: ACTOR }),
      );
    });
  });
});
