import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentStatus,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { UniquenessCheckProcessorErrors } from './uniqueness-check.errors';
import {
  createAuditApiService,
  fetchSimilarMassIdDocuments,
} from './uniqueness-check.helpers';

export const RESULT_COMMENTS = {
  NO_DUPLICATES_FOUND:
    'No other documents with the same attributes were found.',
  ONLY_CANCELLED_DUPLICATES: (
    totalDuplicates: number,
    cancelledCount: number,
  ) =>
    `${totalDuplicates} similar documents were found, but all are cancelled (${cancelledCount}).`,
  VALID_DUPLICATE_FOUND: (
    totalDuplicates: number,
    validDuplicatesCount: number,
  ) =>
    `${totalDuplicates} similar documents were found, of which ${validDuplicatesCount} are not cancelled.`,
} as const;

interface RuleSubject {
  cancelledCount: number;
  totalDuplicates: number;
  validDuplicatesCount: number;
}

export class UniquenessCheckProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected readonly processorErrors = new UniquenessCheckProcessorErrors();

  protected override evaluateResult({
    cancelledCount,
    totalDuplicates,
    validDuplicatesCount,
  }: RuleSubject): EvaluateResultOutput {
    if (validDuplicatesCount > 0) {
      return {
        resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(
          totalDuplicates,
          validDuplicatesCount,
        ),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (cancelledCount > 0) {
      return {
        resultComment: RESULT_COMMENTS.ONLY_CANCELLED_DUPLICATES(
          totalDuplicates,
          cancelledCount,
        ),
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.NO_DUPLICATES_FOUND,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override async getRuleSubject(
    document: Document,
  ): Promise<RuleSubject> {
    const duplicateDocuments = await fetchSimilarMassIdDocuments(
      document,
      createAuditApiService(),
    );

    const cancelledCount = duplicateDocuments.filter(
      (duplicateDocument) =>
        duplicateDocument.status === DocumentStatus.CANCELLED,
    ).length;

    return {
      cancelledCount,
      totalDuplicates: duplicateDocuments.length,
      validDuplicatesCount: duplicateDocuments.length - cancelledCount,
    };
  }
}
