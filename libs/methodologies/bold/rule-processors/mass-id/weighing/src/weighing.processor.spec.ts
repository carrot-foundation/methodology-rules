import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleFindings,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import * as scaleTicketVerification from './scale-ticket-verification/scale-ticket-verification.helpers';
import {
  INVALID_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WEIGHING_FINDINGS } from './weighing.findings';
import { WeighingProcessor } from './weighing.processor';
import {
  weighingErrorTestCases,
  weighingTestCases,
} from './weighing.test-cases';

describe('WeighingProcessor', () => {
  const ruleDataProcessor = new WeighingProcessor();

  let verifyScaleTicketNetWeightSpy: vi.MockInstance<
    typeof scaleTicketVerification.verifyScaleTicketNetWeight
  >;

  beforeEach(() => {
    vi.restoreAllMocks();

    verifyScaleTicketNetWeightSpy = vi
      .spyOn(scaleTicketVerification, 'verifyScaleTicketNetWeight')
      .mockResolvedValue({ errors: [] });
  });

  const processTestCase = (testCase: (typeof weighingTestCases)[number]) => {
    if ('scaleTicketVerificationError' in testCase) {
      verifyScaleTicketNetWeightSpy.mockResolvedValueOnce({
        errors: [testCase.scaleTicketVerificationError],
      });
    }

    return createRuleTestFixture({
      accreditationDocuments: testCase.accreditationDocuments,
      massIDDocumentsParams: {
        externalEventsMap: testCase.massIDDocumentEvents,
      },
      ruleDataProcessor,
      spyOnDocumentQueryServiceLoad,
    });
  };

  describe('WeighingProcessor', () => {
    it.each(weighingTestCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        const { ruleInput, ruleOutput } = await processTestCase(testCase);

        expectRuleOutput({
          findings: WEIGHING_FINDINGS,
          resultComment: testCase.resultComment,
          resultStatus: testCase.resultStatus,
          ruleInput,
          ruleOutput,
        });
      },
    );

    it.each([
      {
        description: 'two simultaneous findings, in message order',
        expectedFindings: [
          {
            code: 'weighing.WRONG_FORMAT.CONTAINER_CAPACITY',
            defaultOwner: 'INTEGRATOR',
          },
          {
            code: 'weighing.INVALID.CONTAINER_CAPACITY_FORMAT',
            defaultOwner: 'INTEGRATOR',
          },
        ],
        resultComment: `${WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY} ${INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT}`,
      },
      {
        description:
          'a Recycler-dependent scale type mismatch followed by an unsupported scale type',
        expectedFindings: [
          {
            code: 'weighing.INVALID.SCALE_TYPE_MISMATCH',
            defaultOwner: 'INTEGRATOR',
            dependsOnAccreditation: 'Recycler',
          },
          {
            code: 'weighing.INVALID.SCALE_TYPE',
            defaultOwner: 'INTEGRATOR',
          },
        ],
        resultComment: weighingTestCases.find(({ scenario }) =>
          scenario.endsWith(
            'in the Recycler Accreditation document and is not supported by the methodology',
          ),
        )?.resultComment,
      },
      {
        description: 'a plate format finding with no accreditation dependency',
        expectedFindings: [
          {
            code: 'weighing.INVALID.VEHICLE_LICENSE_PLATE_FORMAT',
            defaultOwner: 'TO_CONFIRM',
          },
        ],
        resultComment: INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT,
      },
    ])(
      'should report $description',
      async ({ expectedFindings, resultComment }) => {
        const testCase = weighingTestCases.find(
          (candidate) => candidate.resultComment === resultComment,
        );

        if (!testCase) {
          throw new Error(`Test case not found for: ${String(resultComment)}`);
        }

        const { ruleOutput } = await processTestCase(testCase);

        expect(ruleOutput.resultContent).toEqual({
          findings: expectedFindings,
        });
      },
    );
  });

  describe('WeighingProcessorErrors', () => {
    it.each(weighingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIDAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIDAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(expectRuleFindings(ruleOutput, WEIGHING_FINDINGS)).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });
});
