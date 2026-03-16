import type { RuleOutputStatus } from './rule.types';

export interface RuleTestCase {
  resultComment: string;
  resultStatus: RuleOutputStatus;
  scenario: string;
}
