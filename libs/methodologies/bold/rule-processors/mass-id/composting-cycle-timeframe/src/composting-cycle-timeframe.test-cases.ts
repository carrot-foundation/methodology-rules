import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const RECYCLED_DATE = '2024-02-27T12:00:00.000Z';
const RECYCLED_DATE_EARLIER = '2024-02-27T11:00:00.000Z';
const DROP_OFF_DATE_RECENT = '2024-02-25T12:00:00.000Z';
const DROP_OFF_DATE_94_DAYS = '2023-11-25T12:00:00.000Z';
const DROP_OFF_DATE_60_DAYS = '2023-12-29T12:00:00.000Z';
const DROP_OFF_DATE_59_DAYS = '2023-12-30T12:00:00.000Z';
const DROP_OFF_DATE_180_DAYS = '2023-08-31T12:00:00.000Z';
const DROP_OFF_DATE_181_DAYS = '2023-08-30T12:00:00.000Z';

export const compostingCycleTimeframeTestCases = [
  {
    dropOffEventDate: DROP_OFF_DATE_RECENT,
    recycledEventDate: RECYCLED_DATE_EARLIER,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'Time interval is less than 60 days (2 days)',
  },
  {
    dropOffEventDate: undefined,
    recycledEventDate: RECYCLED_DATE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'Drop off event date is missing',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_94_DAYS,
    recycledEventDate: RECYCLED_DATE_EARLIER,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'Time interval is within range (94 days)',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_60_DAYS,
    recycledEventDate: RECYCLED_DATE,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'Edge case: Exactly 60 days (minimum allowed)',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_180_DAYS,
    recycledEventDate: RECYCLED_DATE,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'Edge case: Exactly 180 days (maximum allowed)',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_59_DAYS,
    recycledEventDate: RECYCLED_DATE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'Edge case: 59 days (just below minimum)',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_181_DAYS,
    recycledEventDate: RECYCLED_DATE,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'Edge case: 181 days (just above maximum)',
  },
  {
    dropOffEventDate: DROP_OFF_DATE_94_DAYS,
    recycledEventDate: undefined,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'Recycled event date is missing',
  },
];
