import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubBoldMassIDDocument,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

import {
  COMPOSTING_CYCLE_MAX_DAYS,
  COMPOSTING_CYCLE_MIN_DAYS,
  HOURS_PER_DAY,
  RESULT_COMMENTS,
  TOLERANCE_IN_HOURS,
} from './composting-cycle-timeframe.constants';
import { CompostingCycleTimeframeProcessor } from './composting-cycle-timeframe.processor';
import { compostingCycleTimeframeTestCases } from './composting-cycle-timeframe.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { DROP_OFF, RECYCLED } = BoldDocumentEventName;

describe('CompostingCycleTimeframeProcessor', () => {
  const ruleDataProcessor = new CompostingCycleTimeframeProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(
    compostingCycleTimeframeTestCases.map((testCase) => {
      let resultComment: string;

      if (!testCase.dropOffEventDate) {
        resultComment = RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT;
      } else if (testCase.recycledEventDate) {
        const parsedRecycled = parseISO(testCase.recycledEventDate);
        const parsedDropOff = parseISO(testCase.dropOffEventDate);
        const difference = differenceInDays(parsedRecycled, parsedDropOff);
        const diffInHours = differenceInHours(parsedRecycled, parsedDropOff);

        const meetsMinimum =
          diffInHours >=
          COMPOSTING_CYCLE_MIN_DAYS * HOURS_PER_DAY - TOLERANCE_IN_HOURS;
        const meetsMaximum =
          diffInHours <=
          COMPOSTING_CYCLE_MAX_DAYS * HOURS_PER_DAY + TOLERANCE_IN_HOURS;

        resultComment =
          meetsMinimum && meetsMaximum
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
                  dropOffEventDate as BoldDocumentEvent['externalCreatedAt'],
              },
            }),
          ],
          [
            RECYCLED,
            stubBoldMassIDRecycledEvent({
              partialDocumentEvent: {
                externalCreatedAt:
                  recycledEventDate as BoldDocumentEvent['externalCreatedAt'],
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
