import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentCategory,
  DocumentType,
  MassIdOrganicSubtype,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { MassIdDefinitionProcessorErrors } from './mass-id-definition.errors';

const ALLOWED_SUBTYPES: string[] = Object.values(MassIdOrganicSubtype);

const { MASS_ID } = DocumentCategory;
const { KG } = MeasurementUnit;
const { ORGANIC } = DocumentType;

export const RESULT_COMMENTS = {
  APPROVED:
    'The document category, measurement unit, subtype, type, and value are correctly defined.',
  INVALID_CATEGORY: (category: string): string =>
    `The document category must be "${MASS_ID}", but "${category}" was provided.`,
  INVALID_MEASUREMENT_UNIT: (measurementUnit: string): string =>
    `The measurement unit must be "${KG}", but "${measurementUnit}" was provided.`,
  INVALID_SUBTYPE: (subtype: unknown): string =>
    `The subtype "${String(subtype)}" is not among the allowed values.`,
  INVALID_TYPE: (type: string): string =>
    `The document type must be "${ORGANIC}", but "${type}" was provided.`,
  INVALID_VALUE: (value: number): string =>
    `The document value must be greater than 0, but "${value}" was provided.`,
} as const;

export class MassIdDefinitionProcessor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors = new MassIdDefinitionProcessorErrors();

  private get RESULT_COMMENT() {
    return RESULT_COMMENTS;
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
        errorMessage: this.RESULT_COMMENT.INVALID_CATEGORY(document.category),
        isValid: document.category === MASS_ID.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.INVALID_TYPE(document.type!),
        isValid: document.type === ORGANIC.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.INVALID_MEASUREMENT_UNIT(
          document.measurementUnit,
        ),
        isValid: document.measurementUnit === KG.valueOf(),
      },
      {
        errorMessage: this.RESULT_COMMENT.INVALID_VALUE(document.currentValue),
        isValid: document.currentValue > 0,
      },
      {
        errorMessage: this.RESULT_COMMENT.INVALID_SUBTYPE(document.subtype),
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
        : errorMessages.join(' '),
      resultStatus: isValid
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
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
}
