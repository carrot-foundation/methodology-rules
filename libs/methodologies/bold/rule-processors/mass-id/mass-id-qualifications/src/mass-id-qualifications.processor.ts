import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  BoldDocumentCategory,
  BoldDocumentType,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MeasurementUnit } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './mass-id-qualifications.constants';
import { MASS_ID_QUALIFICATIONS_FINDINGS } from './mass-id-qualifications.findings';

const ALLOWED_SUBTYPES: string[] = Object.values(MassIDOrganicSubtype);

const { MASS_ID } = BoldDocumentCategory;
const { KG } = MeasurementUnit;
const { ORGANIC } = BoldDocumentType;

export class MassIDQualificationsProcessor extends ParentDocumentRuleProcessor<BoldDocument> {
  protected override evaluateResult(
    document: BoldDocument,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const validationResult = this.validateRequiredFields(document);

    if (validationResult) {
      return validationResult;
    }

    const validationCriteria = [
      {
        failure: MASS_ID_QUALIFICATIONS_FINDINGS.render(
          'FAILED.INVALID_CATEGORY',
          document.category,
        ),
        isValid: document.category === MASS_ID.valueOf(),
      },
      {
        failure: MASS_ID_QUALIFICATIONS_FINDINGS.render(
          'FAILED.INVALID_TYPE',
          document.type!,
        ),
        isValid: document.type === ORGANIC.valueOf(),
      },
      {
        failure: MASS_ID_QUALIFICATIONS_FINDINGS.render(
          'FAILED.INVALID_MEASUREMENT_UNIT',
          document.measurementUnit,
        ),
        isValid: document.measurementUnit === KG.valueOf(),
      },
      {
        failure: MASS_ID_QUALIFICATIONS_FINDINGS.render(
          'FAILED.INVALID_VALUE',
          document.currentValue,
        ),
        isValid: document.currentValue > 0,
      },
      {
        failure: MASS_ID_QUALIFICATIONS_FINDINGS.render(
          'FAILED.INVALID_SUBTYPE',
          document.subtype,
        ),
        isValid: this.isValidSubtype(document.subtype),
      },
    ];

    const failures = validationCriteria
      .filter(({ isValid }) => !isValid)
      .map(({ failure }) => failure);

    if (failures.length === 0) {
      return {
        resultComment: RESULT_COMMENTS.passed.VALID_QUALIFICATIONS,
        resultStatus: 'PASSED',
      };
    }

    return {
      resultComment: failures.map(({ message }) => message).join(' '),
      resultFindings: failures.map(({ finding }) => finding),
      resultStatus: 'FAILED',
    };
  }

  protected override getRuleSubject(
    document: BoldDocument,
  ): BoldDocument | undefined {
    return document;
  }

  private isValidSubtype(subtype: string | undefined): boolean {
    if (!subtype) {
      return false;
    }

    return ALLOWED_SUBTYPES.includes(subtype);
  }

  private validateRequiredFields(
    document: BoldDocument,
  ): EvaluateResultOutput | undefined {
    if (isNil(document.type)) {
      return {
        ...MASS_ID_QUALIFICATIONS_FINDINGS.result(
          'ERROR.DOCUMENT_TYPE_NOT_FOUND',
        ),
        resultStatus: 'FAILED',
      };
    }

    if (isNil(document.subtype)) {
      return {
        ...MASS_ID_QUALIFICATIONS_FINDINGS.result(
          'ERROR.DOCUMENT_SUBTYPE_NOT_FOUND',
        ),
        resultStatus: 'FAILED',
      };
    }

    return undefined;
  }
}
