import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNonEmptyArray, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class MtrAttachmentVerificationProcessor extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED);
    }

    const { externalEvents } = document;

    const result = (externalEvents ?? []).every((event) => {
      const { HAS_MTR, REPORT_TYPE } = DocumentEventAttributeName;
      const reportType = getEventAttributeValue(event, REPORT_TYPE);
      const hasMtrValue = getEventAttributeValue(event, HAS_MTR);

      return reportType === ReportType.MTR && hasMtrValue !== false
        ? isNonEmptyArray(event.attachments)
        : true;
    });

    return mapToRuleOutput(
      ruleInput,
      result ? RuleOutputStatus.APPROVED : RuleOutputStatus.REJECTED,
    );
  }
}
