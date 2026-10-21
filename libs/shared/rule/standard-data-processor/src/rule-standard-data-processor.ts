import type { AnyObject } from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNil } from '@carrot-fndn/shared/helpers';
import {
  mapToRuleOutput,
  SHARED_FINDINGS,
} from '@carrot-fndn/shared/rule/result';
import {
  type RuleFinding,
  type RuleInput,
  type RuleOutput,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export interface EvaluateResultOutput {
  resultComment?: string | undefined;
  resultContent?: AnyObject;
  resultFindings?: RuleFinding[] | undefined;
  resultStatus: RuleOutputStatus;
}

export abstract class RuleStandardDataProcessor<
  InputDocument,
  RuleSubject,
> extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await this.loadDocument(ruleInput);

    if (isNil(document)) {
      const { finding, message } = SHARED_FINDINGS.render(
        'ERROR.DOCUMENT_NOT_LOADED',
        ruleInput.parentDocumentId as string,
      );

      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: message,
        resultFindings: [finding],
      });
    }

    const ruleSubject = await this.getRuleSubject(document);

    if (isNil(ruleSubject)) {
      return mapToRuleOutput(ruleInput, 'PASSED', {
        resultComment: this.getMissingRuleSubjectResultComment(),
      });
    }

    const { resultComment, resultContent, resultFindings, resultStatus } =
      await this.evaluateResult(ruleSubject);

    return mapToRuleOutput(ruleInput, resultStatus, {
      ...(resultComment && {
        resultComment,
      }),
      ...(resultContent && {
        resultContent,
      }),
      resultFindings,
    });
  }

  protected abstract evaluateResult(
    data: RuleSubject,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput>;

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
