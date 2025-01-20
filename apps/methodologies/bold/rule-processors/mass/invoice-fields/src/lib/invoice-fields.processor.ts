import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  eventHasMetadataAttribute,
  eventHasNonEmptyStringAttribute,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { INVOICE_ATTRIBUTES } from './invoice-fields.constants';

export class InvoiceFieldsProcessor extends RuleDataProcessor {
  static resultComment = {
    hasNoInvoiceFields: 'Invoice fields are missing',
    noMissingInvoiceFields: 'No missing invoice fields',
  };

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

    const resultStatus = (document.externalEvents ?? []).every((event) => {
      const hasInvoiceNumber = eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.MOVE],
        metadataName: DocumentEventAttributeName.INVOICE_NUMBER,
      });

      return hasInvoiceNumber
        ? INVOICE_ATTRIBUTES.every((attributeName) =>
            eventHasNonEmptyStringAttribute(event, attributeName),
          )
        : true;
    })
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    const resultComment = {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? InvoiceFieldsProcessor.resultComment.noMissingInvoiceFields
          : InvoiceFieldsProcessor.resultComment.hasNoInvoiceFields,
    };

    return mapToRuleOutput(ruleInput, resultStatus, resultComment);
  }
}
