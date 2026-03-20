import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubBoldMassIDDocument,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import { differenceInDays, parseISO } from 'date-fns';

import { RESULT_COMMENTS } from './composting-cycle-timeframe.constants';
import { CompostingCycleTimeframeProcessor } from './composting-cycle-timeframe.processor';
import { compostingCycleTimeframeTestCases } from './composting-cycle-timeframe.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { DROP_OFF, RECYCLED } = DocumentEventName;

describe('CompostingCycleTimeframeProcessor', () => {
  const ruleDataProcessor = new CompostingCycleTimeframeProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(
    compostingCycleTimeframeTestCases.map((testCase) => {
      let resultComment: string;

      if (!testCase.dropOffEventDate) {
        resultComment = RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT;
      } else if (testCase.recycledEventDate) {
        const difference = differenceInDays(
          parseISO(testCase.recycledEventDate),
          parseISO(testCase.dropOffEventDate),
        );

        resultComment =
          testCase.resultStatus === RuleOutputStatus.PASSED
            ? RESULT_COMMENTS.passed.TIMEFRAME_WITHIN_RANGE(difference)
            : RESULT_COMMENTS.failed.TIMEFRAME_OUT_OF_RANGE(difference);
      } else {
        resultComment = RESULT_COMMENTS.failed.MISSING_RECYCLED_EVENT;
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
      const ruleInput = stubRuleInput();
      const document = stubBoldMassIDDocument({
        externalEventsMap: new Map([
          [
            DROP_OFF,
            stubBoldMassIDDropOffEvent({
              partialDocumentEvent: {
                externalCreatedAt:
                  dropOffEventDate as DocumentEvent['externalCreatedAt'],
              },
            }),
          ],
          [
            RECYCLED,
            stubBoldMassIDRecycledEvent({
              partialDocumentEvent: {
                externalCreatedAt:
                  recycledEventDate as DocumentEvent['externalCreatedAt'],
              },
            }),
          ],
        ]),
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
