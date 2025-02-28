import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getOrUndefined } from '@carrot-fndn/shared/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentStatus,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { assert } from 'typia';

import { CreditAbsenceProcessorErrors } from './credit-absence.processor.errors';

export interface RuleSubject {
  creditDocuments: Document[];
}

export class CreditAbsenceProcessor extends RuleDataProcessor {
  private readonly creditMatch: DocumentMatcher;

  readonly errorProcessor = new CreditAbsenceProcessorErrors();

  constructor(creditMatch: DocumentMatcher) {
    super();

    this.creditMatch = creditMatch;
  }

  private get RESULT_COMMENT() {
    return {
      APPROVED: `The MassID is not linked to a valid ${this.creditMatch.match.type}`,
    } as const;
  }

  private evaluateResult({
    creditDocuments,
  }: RuleSubject): EvaluateResultOutput {
    const hasNoCancelledCreditDocuments = creditDocuments.some(
      (creditDocument) =>
        creditDocument.status !== DocumentStatus.CANCELLED.toString(),
    );

    if (hasNoCancelledCreditDocuments) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
          assert<NonEmptyString>(this.creditMatch.match.type),
        ),
      );
    }

    return {
      resultComment: this.RESULT_COMMENT.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const creditDocuments: Document[] = [];

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (this.creditMatch.matches(documentReference)) {
        creditDocuments.push(document);
      }
    });

    return {
      creditDocuments,
    };
  }

  protected async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: {
        parentDocument: {
          omit: true,
          relatedDocuments: [this.creditMatch.match],
        },
      },
      documentId: ruleInput.documentId,
    });
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);

      const ruleSubject = await this.getRuleSubject(documentsQuery);

      const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }
}
