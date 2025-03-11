import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { TimeIntervalCheckProcessor } from './time-interval-check.processor';
import { timeIntervalTestCases } from './time-interval-check.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('TimeIntervalCheckProcessor', () => {
  const ruleDataProcessor = new TimeIntervalCheckProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(
    timeIntervalTestCases.map((testCase) => ({
      ...testCase,
      resultComment:
        testCase.resultStatus === RuleOutputStatus.APPROVED
          ? testCase.dropOffEventDate && testCase.recycledEventDate
            ? ruleDataProcessor['RESULT_COMMENT'].APPROVED
            : ruleDataProcessor['RESULT_COMMENT'].NOT_APPLICABLE
          : ruleDataProcessor['RESULT_COMMENT'].REJECTED,
    })),
  )(
    `should validate time interval between events - $scenario`,
    async ({
      dropOffEventDate,
      recycledEventDate,
      resultComment,
      resultStatus,
    }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            externalCreatedAt: dropOffEventDate,
            name: DocumentEventName.DROP_OFF,
          }),
          stubDocumentEvent({
            externalCreatedAt: recycledEventDate,
            name: DocumentEventName.RECYCLED,
          }),
        ],
      });

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
