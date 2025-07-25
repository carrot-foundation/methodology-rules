import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { addDays, addHours, subDays, subSeconds } from 'date-fns';

import {
  ProjectPeriodLimitProcessor,
  RESULT_COMMENTS,
} from './project-period-limit.processor';

const createBRTDateString = (date: Date): string => {
  const utcDate = new Date(date);
  const brtAsUtc = addHours(utcDate, 3);

  return brtAsUtc.toISOString();
};

class TestProjectPeriodLimitProcessor extends ProjectPeriodLimitProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

const ruleDataProcessor = new TestProjectPeriodLimitProcessor();

const getEligibleDate = () => ruleDataProcessor.getTestEligibleDate();

export const projectPeriodLimitTestCases = [
  {
    externalCreatedAt: addDays(getEligibleDate(), 1).toISOString(),
    resultComment: RESULT_COMMENTS.VALID_RECYCLED_EVENT_DATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'the Recycled event was created after the eligible date',
  },
  {
    externalCreatedAt: subDays(getEligibleDate(), 1).toISOString(),
    resultComment: RESULT_COMMENTS.INVALID_RECYCLED_EVENT_DATE,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'the Recycled event was created before the eligible date',
  },
  {
    externalCreatedAt: getEligibleDate().toISOString(),
    resultComment: RESULT_COMMENTS.VALID_RECYCLED_EVENT_DATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'the Recycled event was created on the eligible date',
  },
  {
    externalCreatedAt: createBRTDateString(subSeconds(getEligibleDate(), 1)),
    resultComment: RESULT_COMMENTS.VALID_RECYCLED_EVENT_DATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the Recycled event was created 1 second before the eligible date in UTC but appears after in BRT timezone',
  },
  {
    externalCreatedAt: createBRTDateString(getEligibleDate()),
    resultComment: RESULT_COMMENTS.VALID_RECYCLED_EVENT_DATE,
    resultStatus: RuleOutputStatus.PASSED,
    scenario:
      'the Recycled event was created exactly at the eligible date (BRT timezone)',
  },
];
