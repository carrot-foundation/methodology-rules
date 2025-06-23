import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import {
  ProjectPeriodLimitProcessor,
  RESULT_COMMENTS,
} from './project-period-limit.processor';
import { projectPeriodLimitTestCases } from './project-period-limit.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

class TestProjectPeriodLimitProcessor extends ProjectPeriodLimitProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

const { RECYCLED } = DocumentEventName;

describe('ProjectPeriodLimitProcessor', () => {
  const ruleDataProcessor = new TestProjectPeriodLimitProcessor();
  const documentLoaderService = jest.mocked(loadDocument);

  it.each(projectPeriodLimitTestCases)(
    'should return $resultStatus when $scenario',
    async ({ externalCreatedAt, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const document = stubBoldMassIdDocument({
        externalEventsMap: new Map([
          [
            RECYCLED,
            stubBoldMassIdRecycledEvent({
              partialDocumentEvent: {
                externalCreatedAt,
              },
            }),
          ],
        ]),
      });

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toMatchObject({
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      });

      expect(typeof ruleOutput.resultComment).toBe('string');
    },
  );

  it('should FAIL the rule if the Recycled event is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const document = stubBoldMassIdDocument({
      externalEventsMap: new Map([[RECYCLED, undefined]]),
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: RESULT_COMMENTS.MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.FAILED,
    });
  });
});
