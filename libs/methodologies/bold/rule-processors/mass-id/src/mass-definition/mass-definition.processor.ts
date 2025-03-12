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

export const RESULT_COMMENTS = {
  APPROVED:
    'The mass definition is compliant: category, type, subtype, value, and measurement unit are valid.',
  CATEGORY_NOT_MATCHING: (category: string): string =>
    `Expected category "${DocumentCategory.MASS_ID}" but got "${category}".`,
  CURRENT_VALUE_NOT_MATCHING: (value: number): string =>
    `Expected current value to be greater than 0 but got ${value}.`,
  MEASUREMENT_UNIT_NOT_MATCHING: (measurementUnit: string): string =>
    `Expected measurement unit "${NewMeasurementUnit.KG}" but got "${measurementUnit}".`,
  SUBTYPE_NOT_MATCHING: (subtype: string): string =>
    `Expected subtype to be one of the following: ${ALLOWED_SUBTYPES.join(', ')} but got "${subtype}".`,
  TYPE_NOT_MATCHING: (type: string): string =>
    `Expected type to be "${DocumentType.ORGANIC}" but got "${type}".`,
} as const;

export class MassDefinitionProcessor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors = new MassDefinitionProcessorErrors();

  private get RESULT_COMMENT() {
    return RESULT_COMMENTS;
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
    const errorMessages: string[] = [];

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
        errorMessage: this.RESULT_COMMENT.SUBTYPE_NOT_MATCHING(
          document.subtype!,
        ),
        isValid: this.isValidSubtype(document.subtype),
      },
    ];

    for (const criteria of validationCriteria) {
      if (!criteria.isValid) {
        errorMessages.push(criteria.errorMessage);
      }
    }

    const isValid = errorMessages.length === 0;

    return {
      resultComment: isValid
        ? this.RESULT_COMMENT.APPROVED
        : errorMessages.join('. '),
      resultStatus: isValid
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}
