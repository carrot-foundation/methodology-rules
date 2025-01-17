import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/recycling/organic/getters';
import { isActorEventWithSourceActorType } from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class WasteOriginIdentifiedProcessor extends ParentDocumentRuleProcessor<DocumentEvent> {
  private ResultComment = {
    APPROVED:
      'The ACTOR event with the actor-type attribute with SOURCE value has the waste-origin-identified value true or false',
    NOT_APPLICABLE:
      'Rule not applicable: The ACTOR event with the actor-type attribute with SOURCE value was not found',
    REJECTED:
      'The ACTOR event with the actor-type attribute with SOURCE value does not have the waste-origin-identified value true or false',
  };

  protected override evaluateResult(
    event: DocumentEvent,
  ): EvaluateResultOutput {
    const wasteOriginIdentifiedValue = getEventAttributeValue(
      event,
      DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
    );

    const resultStatus =
      typeof wasteOriginIdentifiedValue === 'boolean'
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.ResultComment.APPROVED
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return this.ResultComment.NOT_APPLICABLE;
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent | undefined {
    return document.externalEvents?.find(isActorEventWithSourceActorType);
  }
}
