import type { RuleInput } from '@carrot-fndn/shared/rule/types';

import { randomUUID } from 'node:crypto';

interface BuildRuleInputFromPreparationOptions {
  prepared: {
    auditDocumentId: string;
    auditedDocumentId: string;
    executionId: string;
  };
}

interface BuildRuleInputOptions {
  documentId: string;
  documentKeyPrefix: string;
  parentDocumentId: string;
}

const PLACEHOLDER_URL = 'https://localhost/placeholder';

export const buildRuleInput = (
  options: BuildRuleInputFromPreparationOptions | BuildRuleInputOptions,
): RuleInput => {
  const identifiers =
    'prepared' in options
      ? {
          documentId: options.prepared.auditDocumentId,
          documentKeyPrefix: `dry-run/${options.prepared.executionId}/documents`,
          parentDocumentId: options.prepared.auditedDocumentId,
        }
      : options;

  return {
    documentId: identifiers.documentId,
    documentKeyPrefix: identifiers.documentKeyPrefix,
    parentDocumentId: identifiers.parentDocumentId,
    requestId: randomUUID(),
    responseToken: 'cli-placeholder-token',
    responseUrl: PLACEHOLDER_URL as RuleInput['responseUrl'],
  };
};
