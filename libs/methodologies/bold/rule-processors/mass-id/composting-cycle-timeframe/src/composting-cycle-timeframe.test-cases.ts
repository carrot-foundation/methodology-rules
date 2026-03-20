import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface CompostingCycleTimeframeTestCase extends Omit<
  RuleTestCase,
  'resultComment'
> {
  dropOffEventDate: string | undefined;
  recycledEventDate: string | undefined;
  resultComment?: string;
}

const RECYCLED_DATE = '2024-02-27T12:00:00.000Z';
const RECYCLED_DATE_EARLIER = '2024-02-27T11:00:00.000Z';
const DROP_OFF_DATE_RECENT = '2024-02-25T12:00:00.000Z';
const DROP_OFF_DATE_94_DAYS = '2023-11-25T12:00:00.000Z';
const DROP_OFF_DATE_60_DAYS = '2023-12-29T12:00:00.000Z';
const DROP_OFF_DATE_59_DAYS = '2023-12-30T12:00:00.000Z';
const DROP_OFF_DATE_180_DAYS = '2023-08-31T12:00:00.000Z';
const DROP_OFF_DATE_181_DAYS = '2023-08-29T12:00:00.000Z';

const { DROP_OFF, RECYCLED } = DocumentEventName;

export const compostingCycleTimeframeTestCases: CompostingCycleTimeframeTestCase[] =
  [
    {
      dropOffEventDate: DROP_OFF_DATE_RECENT,
      manifestExample: true,
      recycledEventDate: RECYCLED_DATE_EARLIER,
      resultComment:
        'The composting cycle duration of 2 days is below the minimum accepted range of 60 days.',
      resultStatus: RuleOutputStatus.FAILED,
      scenario: 'Time interval is less than 60 days (2 days)',
    },
    {
      dropOffEventDate: undefined,
      recycledEventDate: RECYCLED_DATE,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: `The "${DROP_OFF}" event date is missing`,
    },
    {
      dropOffEventDate: DROP_OFF_DATE_94_DAYS,
      manifestExample: true,
      recycledEventDate: RECYCLED_DATE_EARLIER,
      resultComment:
        'The composting cycle duration of 94 days is within the accepted range of 60 to 180 days.',
      resultStatus: RuleOutputStatus.PASSED,
      scenario: 'Time interval is within range (94 days)',
    },
    {
      dropOffEventDate: DROP_OFF_DATE_60_DAYS,
      recycledEventDate: RECYCLED_DATE,
      resultStatus: RuleOutputStatus.PASSED,
      scenario: 'Edge case: Exactly 60 days (minimum allowed)',
    },
    {
      dropOffEventDate: DROP_OFF_DATE_180_DAYS,
      recycledEventDate: RECYCLED_DATE,
      resultStatus: RuleOutputStatus.PASSED,
      scenario: 'Edge case: Exactly 180 days (maximum allowed)',
    },
    {
      dropOffEventDate: DROP_OFF_DATE_59_DAYS,
      recycledEventDate: RECYCLED_DATE,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: 'Edge case: 59 days (just below minimum)',
    },
    {
      dropOffEventDate: DROP_OFF_DATE_181_DAYS,
      recycledEventDate: RECYCLED_DATE,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: 'Edge case: 182 days (just above maximum)',
    },
    {
      dropOffEventDate: DROP_OFF_DATE_94_DAYS,
      recycledEventDate: undefined,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: `The "${RECYCLED}" event date is missing`,
    },
  ];
