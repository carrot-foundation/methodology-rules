import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleFindings,
  expectRuleOutput,
  findTestCase,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import * as scaleTicketVerification from './scale-ticket-verification/scale-ticket-verification.helpers';
import { WEIGHING_FINDINGS } from './weighing.findings';
import { WeighingProcessor } from './weighing.processor';
import {
  weighingErrorTestCases,
  weighingTestCases,
} from './weighing.test-cases';

const { CONTAINER_CAPACITY, SCALE_TYPE, VEHICLE_LICENSE_PLATE } =
  BoldAttributeName;
const { WEIGHING } = BoldDocumentEventName;

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
        scenario: `The "${CONTAINER_CAPACITY}" attribute is missing`,
      },
      {
        description:
          'a scale type mismatch followed by an unsupported scale type, with no accreditation dependency',
        expectedFindings: [
          {
            code: 'weighing.INVALID.SCALE_TYPE_MISMATCH',
            defaultOwner: 'INTEGRATOR',
          },
          {
            code: 'weighing.INVALID.SCALE_TYPE',
            defaultOwner: 'INTEGRATOR',
          },
        ],
        scenario: `The "${SCALE_TYPE}" attribute is not equal to the "${SCALE_TYPE}" attribute in the Recycler Accreditation document and is not supported by the methodology`,
      },
      {
        description:
          'a missing scale type in the accreditation with no accreditation dependency',
        expectedFindings: [
          {
            code: 'weighing.NOT_FOUND.ACCREDITATION_EVENT',
            defaultOwner: 'RECYCLER',
          },
        ],
        scenario: `The Recycler Accreditation document does not have a "${SCALE_TYPE}" attribute`,
      },
      {
        description: 'a plate format finding with no accreditation dependency',
        expectedFindings: [
          {
            code: 'weighing.INVALID.VEHICLE_LICENSE_PLATE_FORMAT',
            defaultOwner: 'TO_CONFIRM',
          },
        ],
        scenario: `The "${VEHICLE_LICENSE_PLATE}" attribute is missing`,
      },
      {
        description: 'a missing weighing event as an invalid rule subject',
        expectedFindings: [
          {
            code: 'weighing.ERROR.INVALID_RULE_SUBJECT',
            defaultOwner: 'INTEGRATOR',
          },
        ],
        scenario: `The MassID document does not have "${WEIGHING}" events`,
      },
    ])('should report $description', async ({ expectedFindings, scenario }) => {
      const { ruleOutput } = await processTestCase(
        findTestCase(weighingTestCases, scenario),
      );

      expect(ruleOutput.resultContent).toEqual({
        findings: expectedFindings,
      });
    });
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
