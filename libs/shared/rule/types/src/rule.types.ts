import type { AnyObject } from '@carrot-fndn/shared/types';

import { tags } from 'typia';

export enum RuleOutputStatus {
  FAILED = 'FAILED',
  PASSED = 'PASSED',
}

export interface IRuleDataProcessor {
  process(data: RuleInput): Promise<RuleOutput>;
}

export type RuleEnvironment = 'DEVELOPMENT' | 'PRODUCTION';

export interface RuleInput {
  documentId: string;
  documentKeyPrefix: string;
  parentDocumentId?: string;
  requestId: string;
  responseToken: string;
  responseUrl: string & tags.Format<'url'>;
  ruleName?: string;
  // TODO: add environment
}

export interface RuleOutput {
  requestId: string;
  responseToken: string;
  responseUrl: string & tags.Format<'url'>;
  resultComment?: string | undefined;
  resultContent?: AnyObject | undefined;
  resultStatus: RuleOutputStatus;
}
