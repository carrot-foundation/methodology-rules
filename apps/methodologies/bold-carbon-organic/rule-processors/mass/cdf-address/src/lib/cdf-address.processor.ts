import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  eventHasRecyclerActor,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface RuleSubject {
  actorRecyclerEvent?: DocumentEvent | undefined;
  reportTypeEvent: DocumentEvent;
}

export class CdfAddressProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private ResultComment = {
    ACTOR_NOT_FOUND: 'Recycler Actor event not found',
    ADDRESS_DOES_NOT_MATCH:
      'In the event with Report Type equal CDF, the address does not match the Recycler"s',
    RULE_NOT_APPLICABLE:
      'Rule not Applicable: The Report Type attribute was not found in any ACTOR event',
  };

  protected evaluateResult(ruleSubject: RuleSubject): EvaluateResultOutput {
    const { actorRecyclerEvent, reportTypeEvent } = ruleSubject;

    if (isNil(actorRecyclerEvent)) {
      return {
        resultComment: this.ResultComment.ACTOR_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const resultStatus =
      actorRecyclerEvent.address.id === reportTypeEvent.address.id
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment: this.ResultComment.ADDRESS_DOES_NOT_MATCH,
      }),
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return this.ResultComment.RULE_NOT_APPLICABLE;
  }

  protected getRuleSubject(document: Document): RuleSubject | undefined {
    const { REPORT_TYPE } = DocumentEventAttributeName;
    const { CDF } = ReportType;
    const actorRecyclerEvent = document.externalEvents?.find(
      eventHasRecyclerActor,
    );

    const reportTypeEvent = document.externalEvents?.find(
      metadataAttributeValueIsAnyOf(REPORT_TYPE, [CDF]),
    );

    if (isNil(reportTypeEvent)) {
      return undefined;
    }

    return { actorRecyclerEvent, reportTypeEvent };
  }
}
