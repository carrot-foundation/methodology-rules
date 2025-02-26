import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { addDays, addHours, subDays, subSeconds } from 'date-fns';
import { random } from 'typia';

import { ProjectPeriodProcessor } from './project-period.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const createBRTDateString = (date: Date): string => {
  const utcDate = new Date(date);
  const brtAsUtc = addHours(utcDate, 3);

  return brtAsUtc.toISOString();
};

class TestProjectPeriodProcessor extends ProjectPeriodProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

describe('ProjectPeriodProcessor', () => {
  const ruleDataProcessor = new TestProjectPeriodProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { RECYCLED } = DocumentEventName;

  const getEligibleDate = () => ruleDataProcessor.getTestEligibleDate();

  it.each([
    {
      externalCreatedAt: addDays(getEligibleDate(), 1).toISOString(),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created after the eligible date',
    },
    {
      externalCreatedAt: subDays(getEligibleDate(), 1).toISOString(),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].INELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event was created before the eligible date',
    },
    {
      externalCreatedAt: getEligibleDate().toISOString(),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      externalCreatedAt: getEligibleDate().toISOString(),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      externalCreatedAt: createBRTDateString(subSeconds(getEligibleDate(), 1)),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created 1 second before the eligible date in UTC but appears after in BRT timezone',
    },
    {
      externalCreatedAt: createBRTDateString(getEligibleDate()),
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created exactly at the eligible date (BRT timezone)',
    },
    {
      externalCreatedAt: undefined,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT']
          .MISSING_RECYCLED_EVENT_EXTERNAL_CREATED_AT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event has no externalCreatedAt attribute',
    },
  ])(
    '$scenario',
    async ({ externalCreatedAt, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            externalCreatedAt,
            name: RECYCLED,
          }),
        ],
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

    const document = stubDocument({
      externalEvents: [],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: ruleDataProcessor['RESULT_COMMENT'].MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });
});
