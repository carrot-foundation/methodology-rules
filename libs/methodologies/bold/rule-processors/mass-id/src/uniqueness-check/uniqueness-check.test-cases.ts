import { DocumentStatus } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENTS } from './uniqueness-check.processor';

const { CANCELLED, OPEN } = DocumentStatus;

export const uniquenessCheckTestCases = [
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.NO_DUPLICATES_FOUND,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'the document is unique',
  },
  {
    newDuplicateDocuments: [{ status: CANCELLED }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.ONLY_CANCELLED_DUPLICATES(2, 2),
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'only cancelled duplicates are found',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }, { status: CANCELLED }],
    oldDuplicateDocuments: [],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 1),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found',
  },
  {
    newDuplicateDocuments: [],
    oldDuplicateDocuments: [{ status: OPEN }, { status: OPEN }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 2),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found in old format',
  },
  {
    newDuplicateDocuments: [{ status: OPEN }],
    oldDuplicateDocuments: [{ status: CANCELLED }],
    resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(2, 1),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'valid duplicates are found in both formats',
  },
];
