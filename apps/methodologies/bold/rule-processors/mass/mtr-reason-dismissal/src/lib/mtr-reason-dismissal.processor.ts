import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  and,
  eventHasNonEmptyStringAttribute,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { MTR_REASON_DISMISSAL_RESULT_COMMENT } from './mtr-reason-dismissal.constants';

export class MtrReasonDismissalProcessor extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      });
    }

    const { OPEN } = DocumentEventName;
    const { HAS_MTR } = DocumentEventAttributeName;

    const openEventWithoutMtr = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([OPEN]),
        metadataAttributeValueIsAnyOf(HAS_MTR, [false]),
      ),
    );

    if (openEventWithoutMtr === undefined) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment: MTR_REASON_DISMISSAL_RESULT_COMMENT.has_mtr,
      });
    }

    const resultStatus = eventHasNonEmptyStringAttribute(
      openEventWithoutMtr,
      DocumentEventAttributeName.HAS_REASON_DISMISSAL_MTR,
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus, {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? MTR_REASON_DISMISSAL_RESULT_COMMENT.approved
          : MTR_REASON_DISMISSAL_RESULT_COMMENT.rejected,
    });
  }
}
