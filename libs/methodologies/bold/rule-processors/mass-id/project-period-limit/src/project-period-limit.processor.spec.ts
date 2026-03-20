import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubBoldMassIDDocument,
  stubBoldMassIDRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { RESULT_COMMENTS } from './project-period-limit.constants';
import { ProjectPeriodLimitProcessor } from './project-period-limit.processor';
import { projectPeriodLimitTestCases } from './project-period-limit.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

class TestProjectPeriodLimitProcessor extends ProjectPeriodLimitProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

const { RECYCLED } = DocumentEventName;

describe('ProjectPeriodLimitProcessor', () => {
  const ruleDataProcessor = new TestProjectPeriodLimitProcessor();
  const documentLoaderService = vi.mocked(loadDocument);

  it.each(projectPeriodLimitTestCases)(
    'should return $resultStatus when $scenario',
    async ({ externalCreatedAt, resultComment, resultStatus }) => {
      const ruleInput = stubRuleInput();

      const document = stubBoldMassIDDocument({
        externalEventsMap: new Map([
          [
            RECYCLED,
            stubBoldMassIDRecycledEvent({
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
    const ruleInput = stubRuleInput();

    const document = stubBoldMassIDDocument({
      externalEventsMap: new Map([[RECYCLED, undefined]]),
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: RESULT_COMMENTS.failed.MISSING_RECYCLED_EVENT,
      resultStatus: 'FAILED' as const,
    });
  });
});
