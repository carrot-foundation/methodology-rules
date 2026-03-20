import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { addDays, addHours, subDays, subSeconds } from 'date-fns';

import { RESULT_COMMENTS } from './project-period-limit.constants';
import { ProjectPeriodLimitProcessor } from './project-period-limit.processor';

const { RECYCLED } = DocumentEventName;

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

interface ProjectPeriodLimitTestCase extends RuleTestCase {
  externalCreatedAt: string;
}

export const projectPeriodLimitTestCases: ProjectPeriodLimitTestCase[] = [
  {
    externalCreatedAt: addDays(getEligibleDate(), 1).toISOString(),
    resultComment: RESULT_COMMENTS.passed.VALID_RECYCLED_EVENT_DATE,
    resultStatus: 'PASSED' as const,
    scenario: `The "${RECYCLED}" event was created after the eligible date`,
  },
  {
    externalCreatedAt: subDays(getEligibleDate(), 1).toISOString(),
    resultComment: RESULT_COMMENTS.failed.INVALID_RECYCLED_EVENT_DATE,
    resultStatus: 'FAILED' as const,
    scenario: `The "${RECYCLED}" event was created before the eligible date`,
  },
  {
    externalCreatedAt: getEligibleDate().toISOString(),
    resultComment: RESULT_COMMENTS.passed.VALID_RECYCLED_EVENT_DATE,
    resultStatus: 'PASSED' as const,
    scenario: `The "${RECYCLED}" event was created on the eligible date`,
  },
  {
    externalCreatedAt: createBRTDateString(subSeconds(getEligibleDate(), 1)),
    resultComment: RESULT_COMMENTS.passed.VALID_RECYCLED_EVENT_DATE,
    resultStatus: 'PASSED' as const,
    scenario: `The "${RECYCLED}" event was created 1 second before the eligible date in UTC but appears after in BRT timezone`,
  },
  {
    externalCreatedAt: createBRTDateString(getEligibleDate()),
    resultComment: RESULT_COMMENTS.passed.VALID_RECYCLED_EVENT_DATE,
    resultStatus: 'PASSED' as const,
    scenario: `The "${RECYCLED}" event was created exactly at the eligible date (BRT timezone)`,
  },
];
