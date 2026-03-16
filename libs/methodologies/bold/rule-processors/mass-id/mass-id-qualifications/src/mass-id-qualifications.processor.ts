import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentCategory,
  DocumentType,
  MassIDOrganicSubtype,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENTS } from './mass-id-qualifications.constants';
import { MassIDQualificationsProcessorErrors } from './mass-id-qualifications.errors';

const ALLOWED_SUBTYPES: string[] = Object.values(MassIDOrganicSubtype);

const { MASS_ID } = DocumentCategory;
const { KG } = MeasurementUnit;
const { ORGANIC } = DocumentType;

export class MassIDQualificationsProcessor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors =
    new MassIDQualificationsProcessorErrors();

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
        errorMessage: RESULT_COMMENTS.failed.INVALID_CATEGORY(
          document.category,
        ),
        isValid: document.category === MASS_ID.valueOf(),
      },
      {
        errorMessage: RESULT_COMMENTS.failed.INVALID_TYPE(document.type!),
        isValid: document.type === ORGANIC.valueOf(),
      },
      {
        errorMessage: RESULT_COMMENTS.failed.INVALID_MEASUREMENT_UNIT(
          document.measurementUnit,
        ),
        isValid: document.measurementUnit === KG.valueOf(),
      },
      {
        errorMessage: RESULT_COMMENTS.failed.INVALID_VALUE(
          document.currentValue,
        ),
        isValid: document.currentValue > 0,
      },
      {
        errorMessage: RESULT_COMMENTS.failed.INVALID_SUBTYPE(document.subtype),
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
        ? RESULT_COMMENTS.passed.VALID_QUALIFICATIONS
        : errorMessages.join(' '),
      resultStatus: isValid ? RuleOutputStatus.PASSED : RuleOutputStatus.FAILED,
    };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
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
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (isNil(document.subtype)) {
      return {
        resultComment:
          this.processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return undefined;
  }
}
