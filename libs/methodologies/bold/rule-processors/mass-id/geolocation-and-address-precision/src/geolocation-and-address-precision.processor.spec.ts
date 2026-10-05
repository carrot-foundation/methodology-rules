import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { PARTICIPANT_ACCREDITATION_ROOT } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldStubsBuilder,
  expectRuleOutput,
  stubAddress,
  stubDocument,
  stubDocumentEvent,
  stubParticipant,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
  BoldDocumentType,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { RESULT_COMMENTS } from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';
import {
  alignActorFacilityAddresses,
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionReviewRequiredTestCases,
  type GeolocationAndAddressPrecisionTestCase,
  geolocationAndAddressPrecisionTestCases,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationAndAddressPrecisionProcessor();

  const runTestCase = async (
    {
      accreditationDocuments,
      actorParticipants,
      massIDDocumentParameters,
      resultComment,
      resultStatus,
    }: GeolocationAndAddressPrecisionTestCase,
    configureDocuments?: (
      documents: Pick<
        ReturnType<BoldStubsBuilder['build']>,
        | 'massIDAuditDocument'
        | 'massIDDocument'
        | 'participantsAccreditationDocuments'
      >,
    ) => void,
  ): Promise<RuleOutput> => {
    const {
      massIDAuditDocument,
      massIDDocument,
      methodologyDocument,
      participantAccreditationGroupDocument,
      participantsAccreditationDocuments,
    } = new BoldStubsBuilder({
      massIDActorParticipants: actorParticipants,
    })
      .createMassIDDocuments(massIDDocumentParameters)
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(accreditationDocuments)
      .build();

    alignActorFacilityAddresses(
      massIDDocument,
      participantsAccreditationDocuments,
    );

    const auditActorEvents = [...actorParticipants.values()].map(
      (participant) =>
        stubDocumentEvent({
          label: participant.type,
          name: BoldDocumentEventName.ACTOR,
          participant,
          relatedDocument: {
            documentId: participantsAccreditationDocuments.get(
              participant.type,
            )!.id,
          },
        }),
    );

    massIDAuditDocument.externalEvents = [
      ...(massIDAuditDocument.externalEvents ?? []),
      ...auditActorEvents,
    ];

    configureDocuments?.({
      massIDAuditDocument,
      massIDDocument,
      participantsAccreditationDocuments,
    });

    if (participantAccreditationGroupDocument !== undefined) {
      participantAccreditationGroupDocument.externalEvents =
        participantAccreditationGroupDocument.externalEvents!.map((event) =>
          event.relatedDocument?.type ===
          BoldDocumentType.PARTICIPANT_ACCREDITATION
            ? event
            : { ...event, relatedDocument: undefined },
        );
    }

    const accreditationRoot = stubDocument(
      {
        ...PARTICIPANT_ACCREDITATION_ROOT.match,
        category: BoldDocumentCategory.METHODOLOGY,
        externalEvents:
          participantAccreditationGroupDocument === undefined
            ? []
            : [
                stubDocumentEvent({
                  relatedDocument: mapDocumentRelation(
                    participantAccreditationGroupDocument,
                  ),
                }),
              ],
        parentDocumentId: methodologyDocument!.id,
      },
      false,
    );

    if (participantAccreditationGroupDocument !== undefined) {
      participantAccreditationGroupDocument.parentDocumentId =
        accreditationRoot.id;
    }

    const allDocuments = [
      accreditationRoot,
      massIDDocument,
      massIDAuditDocument,
      ...(participantAccreditationGroupDocument === undefined
        ? []
        : [participantAccreditationGroupDocument]),
      ...participantsAccreditationDocuments.values(),
    ];

    spyOnLoadDocument(massIDAuditDocument);
    spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

    const ruleInput = stubRuleInput({
      documentId: massIDAuditDocument.id,
    });

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expectRuleOutput({
      resultComment,
      resultStatus,
      ruleInput,
      ruleOutput,
    });

    return ruleOutput;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['selected-facility', 'other-facility'])(
    'should use GPS exceptions only from the selected final Recycler facility (%s)',
    async (exceptionFacility) => {
      const fixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) =>
          testCase.scenario ===
          'The Recycler has GPS exceptions for DROP_OFF event (GPS validation should be skipped)',
      )!;
      const rejectedFixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) =>
          testCase.scenario ===
          'The Recycler has only latitude GPS exception (should NOT skip GPS validation)',
      )!;
      const output = await runTestCase(
        {
          ...fixture,
          ...(exceptionFacility === 'other-facility' && {
            resultComment: rejectedFixture.resultComment,
            resultStatus: rejectedFixture.resultStatus,
          }),
        },
        ({ massIDDocument, participantsAccreditationDocuments }) => {
          const selected = participantsAccreditationDocuments.get('Recycler')!;
          const exceptionFreeEvents = selected.externalEvents!.map((event) => ({
            ...event,
            metadata: {
              ...event.metadata,
              attributes: event.metadata?.attributes?.filter(
                (attribute) =>
                  attribute.name !== BoldAttributeName.APPROVED_EXCEPTIONS,
              ),
            },
          }));
          const address = stubAddress({
            participantId: selected.primaryParticipant.id,
          });
          const other = {
            ...selected,
            externalEvents:
              exceptionFacility === 'selected-facility'
                ? exceptionFreeEvents
                : selected.externalEvents,
            id: 'other-recycler-facility',
            primaryAddress: address,
          };

          if (exceptionFacility === 'other-facility') {
            selected.externalEvents = exceptionFreeEvents;
          }

          participantsAccreditationDocuments.set('other-recycler', other);
          massIDDocument.externalEvents!.push(
            stubDocumentEvent({
              address,
              label: 'Recycler',
              name: BoldDocumentEventName.ACTOR,
              participant: selected.primaryParticipant,
            }),
          );
          const dropOff = massIDDocument.externalEvents!.find(
            (event) => event.name === BoldDocumentEventName.DROP_OFF,
          )!;

          dropOff.address = {
            ...dropOff.address,
            id: selected.primaryAddress.id,
          };
        },
      );

      expect(output.resultStatus).toBe(
        exceptionFacility === 'selected-facility' ? 'PASSED' : 'FAILED',
      );
    },
  );

  it.each([
    'healthy',
    'same-participant',
    'unmatched-facility',
    'wrong-first-facility',
  ])(
    'should validate every intermediate Processor scope (%s)',
    async (control) => {
      const expectedStatus =
        control === 'healthy' || control === 'same-participant'
          ? 'PASSED'
          : 'FAILED';
      const generatorComment = RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(
        MassIDActorType.WASTE_GENERATOR,
        0,
      );
      const recyclerComment = RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(
        MassIDActorType.RECYCLER,
        0,
      );
      const processorComment = RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(
        MassIDActorType.PROCESSOR,
        0,
      );
      const fixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) =>
          testCase.resultComment === `${generatorComment} ${recyclerComment}`,
      )!;

      const output = await runTestCase(
        {
          ...fixture,
          resultComment:
            expectedStatus === 'PASSED'
              ? [
                  generatorComment,
                  ...Array.from({ length: 4 }).fill(processorComment),
                  recyclerComment,
                ].join(' ')
              : RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(
                  MassIDActorType.PROCESSOR,
                ),
          resultStatus: expectedStatus,
        },
        ({ massIDDocument, participantsAccreditationDocuments }) => {
          const first = participantsAccreditationDocuments.get('Processor')!;

          first.externalEvents = [
            ...(first.externalEvents?.filter(
              (event) => event.name !== BoldDocumentEventName.FACILITY_ADDRESS,
            ) ?? []),
            stubDocumentEvent({
              address: first.primaryAddress,
              name: BoldDocumentEventName.FACILITY_ADDRESS,
              participant: first.primaryParticipant,
            }),
          ];
          const participant =
            control === 'same-participant' || control === 'unmatched-facility'
              ? first.primaryParticipant
              : stubParticipant();
          const address = stubAddress({ participantId: participant.id });
          const second = {
            ...first,
            externalEvents: first.externalEvents.map((event) =>
              event.name === BoldDocumentEventName.FACILITY_ADDRESS
                ? { ...event, address, participant }
                : event,
            ),
            id: 'second-processor-accreditation',
            primaryAddress: address,
            primaryParticipant: participant,
          };

          participantsAccreditationDocuments.set('second-processor', second);
          const events = massIDDocument.externalEvents!;
          const finalDropOff = events.findIndex(
            (event) => event.name === BoldDocumentEventName.DROP_OFF,
          );

          events.splice(
            finalDropOff,
            0,
            ...[first, second].flatMap((document) =>
              [
                BoldDocumentEventName.DROP_OFF,
                BoldDocumentEventName.PICK_UP,
              ].map((name) =>
                stubDocumentEvent({
                  address:
                    control === 'unmatched-facility'
                      ? {
                          ...document.primaryAddress,
                          id: 'unmatched-measured-address',
                        }
                      : document.primaryAddress,
                  metadata: undefined,
                  name,
                  participant: document.primaryParticipant,
                }),
              ),
            ),
          );
          events.push(
            stubDocumentEvent({
              address,
              label: 'Processor',
              name: BoldDocumentEventName.ACTOR,
              participant,
            }),
          );

          if (control === 'wrong-first-facility') {
            first.primaryAddress = {
              ...first.primaryAddress,
              id: 'unrelated-facility',
            };
          }
        },
      );

      expect(output.resultStatus).toBe(expectedStatus);
    },
  );

  it.each([MassIDActorType.RECYCLER, MassIDActorType.WASTE_GENERATOR])(
    'should refuse another facility instead of treating %s as optional absence',
    async (role) => {
      const fixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) => testCase.resultStatus === 'PASSED',
      )!;
      const output = await runTestCase(
        {
          ...fixture,
          resultComment:
            RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(role),
          resultStatus: 'FAILED',
        },
        ({ participantsAccreditationDocuments }) => {
          const accreditation = participantsAccreditationDocuments.get(role)!;

          accreditation.primaryAddress = {
            ...accreditation.primaryAddress,
            id: 'unrelated-facility',
          };
        },
      );

      expect(output.resultStatus).toBe('FAILED');
    },
  );

  it.each(['absent-generator', 'legacy-generator-without-events'] as const)(
    'should preserve optional compatibility for %s',
    async (control) => {
      const recyclerComment = RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(
        MassIDActorType.RECYCLER,
        0,
      );
      const fixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) =>
          testCase.resultComment ===
          `${RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(MassIDActorType.WASTE_GENERATOR, 0)} ${recyclerComment}`,
      )!;

      const output = await runTestCase(
        {
          ...fixture,
          resultComment: `${RESULT_COMMENTS.passed.OPTIONAL_VALIDATION_SKIPPED(MassIDActorType.WASTE_GENERATOR)} ${recyclerComment}`,
        },
        ({ participantsAccreditationDocuments }) => {
          if (control === 'absent-generator') {
            participantsAccreditationDocuments.delete(
              MassIDActorType.WASTE_GENERATOR,
            );
          } else {
            participantsAccreditationDocuments.get(
              MassIDActorType.WASTE_GENERATOR,
            )!.externalEvents = undefined;
          }
        },
      );

      expect(output.resultStatus).toBe('PASSED');
    },
  );

  it.each([
    'healthy',
    'missing-address',
    'wrong-address',
    'wrong-owner',
  ] as const)(
    'should validate the selected history facility (%s)',
    async (control) => {
      const fixture = geolocationAndAddressPrecisionTestCases.find(
        (testCase) => testCase.resultStatus === 'PASSED',
      )!;
      const methodologyId = 'e8baf090-6c93-4d12-b40d-859230b851ab';
      const expected =
        control === 'healthy'
          ? fixture
          : {
              ...fixture,
              resultComment:
                RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(
                  MassIDActorType.RECYCLER,
                ),
              resultStatus: 'FAILED' as const,
            };

      const output = await runTestCase(
        expected,
        ({ massIDAuditDocument, participantsAccreditationDocuments }) => {
          const recycler = participantsAccreditationDocuments.get(
            MassIDActorType.RECYCLER,
          )!;
          const result = recycler.externalEvents!.find(
            (event) =>
              event.name === BoldDocumentEventName.ACCREDITATION_RESULT,
          )!;
          const effectiveDate = result.metadata!.attributes!.find(
            (attribute) => attribute.name === BoldAttributeName.EFFECTIVE_DATE,
          )!.value;

          if (typeof effectiveDate !== 'string') {
            throw new TypeError('Fixture effective date is missing');
          }
          recycler.externalEvents!.push(
            stubDocumentEvent({
              isPublic: false,
              metadata: {
                attributes: [
                  {
                    isPublic: false,
                    name: 'Accreditation History',
                    value: {
                      contentHash: 'a'.repeat(64),
                      disposition: 'APPROVED',
                      effectiveFrom: effectiveDate.slice(0, 10),
                      revision: 1,
                      revisionId: 'e8baf090-6c93-4d12-b40d-859230b851ac',
                      schemaVersion: '1.0.0',
                      scope: {
                        cycleId: 'fictional-cycle',
                        facilityId: recycler.primaryAddress.id,
                        methodologyId,
                        methodologyVersion: '1.0.0',
                        participantId: recycler.primaryParticipant.id,
                        role: MassIDActorType.RECYCLER,
                      },
                    },
                  },
                ],
              },
              name: 'Accreditation Revision',
            }),
          );
          massIDAuditDocument.externalEvents!.push(
            stubDocumentEvent({
              isPublic: false,
              metadata: {
                attributes: [
                  {
                    isPublic: false,
                    name: 'Accreditation Evaluation',
                    value: {
                      evaluationDate: '2026-10-04T12:00:00.000Z',
                      methodologyId,
                      methodologyVersion: '1.0.0',
                      schemaVersion: '1.0.0',
                    },
                  },
                ],
              },
              name: 'Accreditation Evaluation',
            }),
          );
          recycler.externalEvents = recycler.externalEvents!.flatMap(
            (event) => {
              if (event.name !== BoldDocumentEventName.FACILITY_ADDRESS) {
                return [event];
              }

              if (control === 'missing-address') {
                return [];
              }

              return [
                {
                  ...event,
                  address: {
                    ...event.address,
                    id: recycler.primaryAddress.id,
                    participantId: recycler.primaryParticipant.id,
                    ...(control === 'wrong-address' && {
                      id: 'unrelated-address',
                    }),
                    ...(control === 'wrong-owner' && {
                      participantId: 'unrelated-participant',
                    }),
                  },
                },
              ];
            },
          );
        },
      );

      expect(output.resultStatus).toBe(expected.resultStatus);
    },
  );

  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async (testCase) => {
      const output = await runTestCase(testCase);

      expect(output.resultStatus).toBe(testCase.resultStatus);
    },
  );

  describe('when ENABLE_REVIEW_REQUIRED is enabled', () => {
    beforeEach(() => {
      vi.stubEnv('ENABLE_REVIEW_REQUIRED', 'true');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.each(geolocationAndAddressPrecisionReviewRequiredTestCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        const output = await runTestCase(testCase);

        expect(output.resultStatus).toBe(testCase.resultStatus);
      },
    );
  });

  describe('GeolocationAndAddressPrecisionProcessorErrors', () => {
    it.each(geolocationAndAddressPrecisionErrorTestCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        if (testCase.massIDAuditDocument) {
          const { documents, massIDAuditDocument } = testCase;

          spyOnLoadDocument(massIDAuditDocument);
          spyOnDocumentQueryServiceLoad(massIDAuditDocument, [
            massIDAuditDocument,
            ...documents,
          ]);

          const ruleInput: RuleInput = stubRuleInput({
            documentId: massIDAuditDocument.id,
          });

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expectRuleOutput({
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
            ruleInput,
            ruleOutput,
          });
        } else {
          spyOnLoadDocument(undefined);

          const ruleInput = stubRuleInput();

          const ruleOutput = await ruleDataProcessor.process(ruleInput);

          expectRuleOutput({
            resultComment: testCase.resultComment,
            resultStatus: testCase.resultStatus,
            ruleInput,
            ruleOutput,
          });
        }
      },
    );
  });
});
