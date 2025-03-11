import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentCategory,
  DocumentType,
  MassSubtype,
  NewMeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { MassDefinitionProcessorErrors } from './mass-definition.errors';

const ALLOWED_SUBTYPES: string[] = Object.values(MassSubtype);

export class MassDefinitionProcessor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors = new MassDefinitionProcessorErrors();

  private get RESULT_COMMENT() {
    return {
      APPROVED:
        'Compliant mass definition: category, type, subtype, value and measurement unit.',
      CATEGORY_NOT_MATCHING: (category: string): string =>
        `Category ${category} should be ${DocumentCategory.MASS_ID}.`,
      CURRENT_VALUE_NOT_MATCHING: (value: number): string =>
        `Current value is ${value}, but it should be greater than 0.`,
      MEASUREMENT_UNIT_NOT_MATCHING: (measurementUnit: string): string =>
        `Measurement unit ${measurementUnit} should be ${NewMeasurementUnit.KG}.`,
      SUBTYPE_NOT_MATCHING: `Subtype does not match with any of the allowed subtypes: ${ALLOWED_SUBTYPES.join(', ')}`,
      TYPE_NOT_MATCHING: (type: string): string =>
        `Type ${type} should be ${DocumentType.ORGANIC}.`,
    } as const;
  }

  private isValidSubtype(subtype: string | undefined): boolean {
    if (!subtype) {
      return false;
    }

    return ALLOWED_SUBTYPES.includes(subtype);
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

    const validationCriteria = [
      {
        errorMessage: this.RESULT_COMMENT.CATEGORY_NOT_MATCHING(
          document.category,
        ),
        isValid: document.category === DocumentCategory.MASS_ID.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.TYPE_NOT_MATCHING(document.type!),
        isValid: document.type === DocumentType.ORGANIC.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.MEASUREMENT_UNIT_NOT_MATCHING(
          document.measurementUnit,
        ),
        isValid: document.measurementUnit === NewMeasurementUnit.KG.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.CURRENT_VALUE_NOT_MATCHING(
          document.currentValue,
        ),
        isValid: document.currentValue > 0,
      },
      {
        errorMessage: this.RESULT_COMMENT.SUBTYPE_NOT_MATCHING,
        isValid: this.isValidSubtype(document.subtype),
      },
    ];

    for (const criteria of validationCriteria) {
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
