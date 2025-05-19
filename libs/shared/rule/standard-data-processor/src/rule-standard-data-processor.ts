import type { AnyObject } from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNil } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export interface EvaluateResultOutput {
  resultComment?: string | undefined;
  resultContent?: AnyObject;
  resultStatus: RuleOutputStatus;
}

export abstract class RuleStandardDataProcessor<
  InputDocument,
  RuleSubject,
> extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await this.loadDocument(ruleInput);

    if (isNil(document)) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.getDocumentNotFoundResultComment(
          ruleInput.parentDocumentId as string,
        ),
      });
    }

    const ruleSubject = await this.getRuleSubject(document);

    if (isNil(ruleSubject)) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment: this.getMissingRuleSubjectResultComment(),
      });
    }

    const { resultComment, resultContent, resultStatus } =
      await this.evaluateResult(ruleSubject);

    return mapToRuleOutput(ruleInput, resultStatus, {
      ...(resultComment && {
        resultComment,
      }),
      ...(resultContent && {
        resultContent,
      }),
    });
  }

  protected abstract evaluateResult(
    data: RuleSubject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput>;

  protected getDocumentNotFoundResultComment(documentId: string): string {
    return `Could not load the document with id ${documentId}`;
  }

  protected getMissingRuleSubjectResultComment(): string {
    return 'Rule not applicable';
  }

  protected abstract getRuleSubject(
    document: InputDocument,
  ): Promise<RuleSubject | undefined> | RuleSubject | undefined;

  protected abstract loadDocument(
    ruleInput: RuleInput,
  ): Promise<InputDocument | undefined>;
}
