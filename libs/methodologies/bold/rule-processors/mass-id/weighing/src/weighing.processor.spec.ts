import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import * as scaleTicketVerification from './scale-ticket-verification/scale-ticket-verification.helpers';
import { WeighingProcessor } from './weighing.processor';
import {
  weighingErrorTestCases,
  weighingTestCases,
} from './weighing.test-cases';

describe('WeighingProcessor', () => {
  const ruleDataProcessor = new WeighingProcessor();

  let verifyScaleTicketNetWeightSpy: jest.SpiedFunction<
    typeof scaleTicketVerification.verifyScaleTicketNetWeight
  >;

  beforeEach(() => {
    jest.restoreAllMocks();

    verifyScaleTicketNetWeightSpy = jest
      .spyOn(scaleTicketVerification, 'verifyScaleTicketNetWeight')
      .mockResolvedValue({ errors: [] });
  });

  describe('WeighingProcessor', () => {
    it.each(weighingTestCases)(
      'should return $resultStatus when $scenario',
      async (testCase) => {
        const {
          accreditationDocuments,
          massIDDocumentEvents,
          resultComment,
          resultStatus,
        } = testCase;

        if ('scaleTicketVerificationError' in testCase) {
          verifyScaleTicketNetWeightSpy.mockResolvedValueOnce({
            errors: [testCase.scaleTicketVerificationError],
          });
        }

        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIDDocumentsParams: {
            externalEventsMap: massIDDocumentEvents,
          },
          ruleDataProcessor,
          spyOnDocumentQueryServiceLoad,
        });

        expectRuleOutput({
          resultComment,
          resultStatus,
          ruleInput,
          ruleOutput,
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

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIDAuditDocument.id,
        };

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
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
