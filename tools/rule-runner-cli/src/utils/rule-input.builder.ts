import type { RuleInput } from '@carrot-fndn/shared/rule/types';

import { randomUUID } from 'node:crypto';

interface BuildRuleInputOptions {
  documentId: string;
  documentKeyPrefix: string;
  parentDocumentId: string;
}

const PLACEHOLDER_URL = 'https://localhost/placeholder';

export const buildRuleInput = (options: BuildRuleInputOptions): RuleInput => ({
  documentId: options.documentId,
  documentKeyPrefix: options.documentKeyPrefix,
  parentDocumentId: options.parentDocumentId,
  requestId: randomUUID(),
  responseToken: 'cli-placeholder-token',
  responseUrl: PLACEHOLDER_URL as RuleInput['responseUrl'],
});
