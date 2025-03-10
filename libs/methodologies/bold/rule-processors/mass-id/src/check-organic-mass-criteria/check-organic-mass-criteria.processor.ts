import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentCategory,
  DocumentType,
  MassSubtype,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { CheckOrganicMassCriteriaProcessorErrors } from './check-organic-mass-criteria.errors';

export class CheckOrganicMassCriteriaProcessor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors =
    new CheckOrganicMassCriteriaProcessorErrors();

  private get RESULT_COMMENT() {
    return {
      APPROVED: 'The Organic MassID criteria is met.',
      CATEGORY_NOT_MATCHING: `Category does not match with ${DocumentCategory.MASS_ID}`,
      CURRENT_VALUE_NOT_MATCHING:
        'The MassID current value is not greater than 0',
      MEASUREMENT_UNIT_NOT_MATCHING: `Measurement unit does not match with ${MeasurementUnit.KG}`,
      SUBTYPE_NOT_MATCHING: `Subtype does not match with any of the allowed subtypes`,
      TYPE_NOT_MATCHING: 'The Organic MassID criteria is not met.',
    } as const;
  }

  private isValidSubtype(subtype: string | undefined): boolean {
    if (!subtype) {
      return false;
    }

    return Object.values<string>(MassSubtype).includes(subtype);
  }

  private validateRequiredFields(
    document: Document,
  ): EvaluateResultOutput | undefined {
    if (isNil(document.type)) {
      return {
        resultComment:
          this.processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(document.subtype)) {
      return {
        resultComment:
          this.processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return undefined;
  }

  protected override evaluateResult(
    document: Document,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const validationResult = this.validateRequiredFields(document);

    if (validationResult) {
      return validationResult;
    }

    const validationCriterias = [
      {
        errorMessage: this.RESULT_COMMENT.CATEGORY_NOT_MATCHING,
        isValid: document.category === DocumentCategory.MASS_ID.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.TYPE_NOT_MATCHING,
        isValid: document.type === DocumentType.ORGANIC.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.MEASUREMENT_UNIT_NOT_MATCHING,
        isValid: document.measurementUnit === MeasurementUnit.KG.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.CURRENT_VALUE_NOT_MATCHING,
        isValid: document.currentValue > 0,
      },
      {
        errorMessage: this.RESULT_COMMENT.SUBTYPE_NOT_MATCHING,
        isValid: this.isValidSubtype(document.subtype),
      },
    ];

    for (const criteria of validationCriterias) {
      if (!criteria.isValid) {
        return {
          resultComment: criteria.errorMessage,
          resultStatus: RuleOutputStatus.REJECTED,
        };
      }
    }

    return {
      resultComment: this.RESULT_COMMENT.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}
