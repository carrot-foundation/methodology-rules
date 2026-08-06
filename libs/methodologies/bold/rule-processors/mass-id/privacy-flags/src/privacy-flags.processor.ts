import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

interface RuleSubject {
  events: BoldDocumentEvent[];
}

export class PrivacyFlagsProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult(): EvaluateResultOutput {
    return { resultStatus: 'PASSED' };
  }

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
    return { events: document.externalEvents ?? [] };
  }
}
