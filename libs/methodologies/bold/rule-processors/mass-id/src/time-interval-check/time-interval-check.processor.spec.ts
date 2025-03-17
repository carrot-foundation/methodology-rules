import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdRecycledEvent,
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

import { TimeIntervalCheckProcessor } from './time-interval-check.processor';
import { timeIntervalTestCases } from './time-interval-check.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { DROP_OFF, RECYCLED } = DocumentEventName;

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
      const document = stubBoldMassIdDocument({
        externalEventsMap: new Map([
          [
            DROP_OFF,
            stubBoldMassIdDropOffEvent({
              partialDocumentEvent: {
                externalCreatedAt:
                  dropOffEventDate as DocumentEvent['externalCreatedAt'],
              },
            }),
          ],
          [
            RECYCLED,
            stubBoldMassIdRecycledEvent({
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
