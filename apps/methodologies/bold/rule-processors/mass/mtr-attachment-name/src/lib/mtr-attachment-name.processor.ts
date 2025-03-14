import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { getDocumentEventAttachmentByLabel } from '@carrot-fndn/shared/methodologies/bold/getters';
import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { MTR_ATTACHMENT_NAME_RESULT_COMMENT } from './mtr-attachment-name.processor.constants';

export class MtrAttachmentNameProcessor extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    const { OPEN } = DocumentEventName;
    const { HAS_MTR } = DocumentEventAttributeName;

    const openEventWithMtr = document?.externalEvents?.find(
      and(
        eventNameIsAnyOf([OPEN]),
        metadataAttributeValueIsAnyOf(HAS_MTR, [true]),
      ),
    );

    if (!openEventWithMtr) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment: MTR_ATTACHMENT_NAME_RESULT_COMMENT.rule_not_applicable,
      });
    }

    const result = getDocumentEventAttachmentByLabel(
      openEventWithMtr,
      ReportType.MTR,
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, result);
  }
}
