import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleOutput,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS } from './geolocation-and-address-precision.findings';
import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';
import {
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionReviewRequiredTestCases,
  type GeolocationAndAddressPrecisionTestCase,
  geolocationAndAddressPrecisionTestCases,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationAndAddressPrecisionProcessor();

  const processTestCase = async ({
    accreditationDocuments,
    actorParticipants,
    massIDDocumentParameters,
  }: GeolocationAndAddressPrecisionTestCase): Promise<{
    ruleInput: RuleInput;
    ruleOutput: RuleOutput;
  }> => {
    const {
      massIDAuditDocument,
      massIDDocument,
      participantsAccreditationDocuments,
    } = new BoldStubsBuilder({
      massIDActorParticipants: actorParticipants,
    })
      .createMassIDDocuments(massIDDocumentParameters)
      .createMassIDAuditDocuments()
      .createMethodologyDocument()
      .createParticipantAccreditationDocuments(accreditationDocuments)
      .build();

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

    const allDocuments = [
      massIDDocument,
      massIDAuditDocument,
      ...participantsAccreditationDocuments.values(),
    ];

    spyOnLoadDocument(massIDAuditDocument);
    spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

    const ruleInput = stubRuleInput({
      documentId: massIDAuditDocument.id,
    });

    return {
      ruleInput,
      ruleOutput: await ruleDataProcessor.process(ruleInput),
    };
  };

  const runTestCase = async (
    testCase: GeolocationAndAddressPrecisionTestCase,
  ): Promise<void> => {
    const { ruleInput, ruleOutput } = await processTestCase(testCase);

    expectRuleOutput({
      findings: GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS,
      resultComment: testCase.resultComment,
      resultStatus: testCase.resultStatus,
      ruleInput,
      ruleOutput,
    });
  };

  const findTestCase = (
    scenario: string,
  ): GeolocationAndAddressPrecisionTestCase => {
    const testCase = geolocationAndAddressPrecisionTestCases.find(
      (candidate) => candidate.scenario === scenario,
    );

    if (!testCase) {
      throw new Error(`Test case not found: ${scenario}`);
    }

    return testCase;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // runTestCase contains the assertions; vitest's expect-expect rule
  // does not follow the indirection.
  // eslint-disable-next-line vitest/expect-expect
  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    runTestCase,
  );

  it('should report one finding per non-passing actor message, none dependent on an accreditation', async () => {
    const { ruleOutput } = await processTestCase(
      findTestCase(
        'The GPS is not set, but the accredited address is set and not valid',
      ),
    );

    expect(ruleOutput.resultContent).toEqual({
      findings: [
        {
          code: 'geolocation-and-address-precision.FAILED.INVALID_ADDRESS_DISTANCE',
          defaultOwner: 'INTEGRATOR',
        },
        {
          code: 'geolocation-and-address-precision.FAILED.INVALID_ADDRESS_DISTANCE',
          defaultOwner: 'INTEGRATOR',
        },
      ],
    });
  });

  it('should not report a finding for the passing actor message of an aggregated result', async () => {
    const { ruleOutput } = await processTestCase(
      findTestCase(
        'The Recycler has expired GPS exceptions (should NOT skip GPS validation)',
      ),
    );

    expect(ruleOutput.resultContent).toEqual({
      findings: [
        {
          code: 'geolocation-and-address-precision.FAILED.INVALID_GPS_DISTANCE',
          defaultOwner: 'INTEGRATOR',
        },
      ],
    });
  });

  describe('when ENABLE_REVIEW_REQUIRED is enabled', () => {
    beforeEach(() => {
      vi.stubEnv('ENABLE_REVIEW_REQUIRED', 'true');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    // runTestCase contains the assertions; vitest's expect-expect rule
    // does not follow the indirection.
    // eslint-disable-next-line vitest/expect-expect
    it.each(geolocationAndAddressPrecisionReviewRequiredTestCases)(
      'should return $resultStatus when $scenario',
      runTestCase,
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
            findings: GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS,
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
            findings: GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS,
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
