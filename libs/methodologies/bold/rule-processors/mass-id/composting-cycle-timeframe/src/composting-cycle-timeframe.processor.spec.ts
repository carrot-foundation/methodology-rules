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
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { differenceInDays, parseISO } from 'date-fns';
import { random } from 'typia';

import { CompostingCycleTimeframeProcessor } from './composting-cycle-timeframe.processor';
import { compostingCycleTimeframeTestCases } from './composting-cycle-timeframe.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { DROP_OFF, RECYCLED } = DocumentEventName;

describe('CompostingCycleTimeframeProcessor', () => {
  const ruleDataProcessor = new CompostingCycleTimeframeProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  it.each(
    compostingCycleTimeframeTestCases.map((testCase) => {
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
          testCase.resultStatus === RuleOutputStatus.PASSED
            ? ruleDataProcessor['RESULT_COMMENT'].PASSED(difference)
            : ruleDataProcessor['RESULT_COMMENT'].FAILED(difference);
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
