import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
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
  ProjectPeriodProcessor,
  RESULT_COMMENTS,
} from './project-period.processor';
import { projectPeriodTestCases } from './project-period.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

class TestProjectPeriodProcessor extends ProjectPeriodProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

const { RECYCLED } = DocumentEventName;

describe('ProjectPeriodProcessor', () => {
  const ruleDataProcessor = new TestProjectPeriodProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(projectPeriodTestCases)(
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

  it('should REJECT the rule if the Recycled event is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const document = stubBoldMassIdDocument({
      externalEventsMap: new Map([[RECYCLED, undefined]]),
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: RESULT_COMMENTS.MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });
});
