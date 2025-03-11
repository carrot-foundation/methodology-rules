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
import { differenceInDays, parseISO } from 'date-fns';
import { random } from 'typia';

import { TimeIntervalCheckProcessor } from './time-interval-check.processor';
import { timeIntervalTestCases } from './time-interval-check.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('TimeIntervalCheckProcessor', () => {
  const ruleDataProcessor = new TimeIntervalCheckProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(
    timeIntervalTestCases.map((testCase) => {
      let resultComment: string;

      if (!testCase.dropOffEventDate) {
        resultComment =
          ruleDataProcessor['RESULT_COMMENT'].MISSING_DROP_OFF_EVENT;
      } else if (testCase.recycledEventDate) {
        const difference = differenceInDays(
          parseISO(testCase.recycledEventDate),
          parseISO(testCase.dropOffEventDate),
        );

        resultComment =
          testCase.resultStatus === RuleOutputStatus.APPROVED
            ? ruleDataProcessor['RESULT_COMMENT'].APPROVED(difference)
            : ruleDataProcessor['RESULT_COMMENT'].REJECTED(difference);
      } else {
        resultComment =
          ruleDataProcessor['RESULT_COMMENT'].MISSING_RECYCLED_EVENT;
      }

      return {
        ...testCase,
        resultComment,
      };
    }),
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
