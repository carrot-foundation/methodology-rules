import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DocumentMeasurementUnitProcessor extends ParentDocumentRuleProcessor<Document> {
  protected override evaluateResult(
    document: Document,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const resultStatus =
      document.measurementUnit === MeasurementUnit.KG.valueOf()
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return { resultStatus };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}
