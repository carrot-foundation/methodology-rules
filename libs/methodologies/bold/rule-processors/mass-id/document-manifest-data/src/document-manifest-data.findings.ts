import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import {
  DOCUMENT_EXTRACTION_COMMENTS,
  LOW_CONFIDENCE_REASON_CODE_PREFIX,
  type ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import {
  CROSS_VALIDATION_COMMENTS,
  RESULT_COMMENTS,
} from './document-manifest-data.constants';
import { DocumentManifestDataProcessorErrors } from './document-manifest-data.errors';
import { ruleDefinition } from './document-manifest-data.rule-definition';

export const DOCUMENT_MANIFEST_DATA_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    CROSS_VALIDATION: CROSS_VALIDATION_COMMENTS,
    DOCUMENT_EXTRACTION: DOCUMENT_EXTRACTION_COMMENTS,
    ERROR: new DocumentManifestDataProcessorErrors().ERROR_MESSAGE,
    RESULT: RESULT_COMMENTS,
  },
  {
    'CROSS_VALIDATION.DOCUMENT_EXTRACTION_CONFIDENCE_LOW': {
      defaultOwner: 'CARROT',
    },
    'CROSS_VALIDATION.DOCUMENT_NUMBER_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'CROSS_VALIDATION.DROP_OFF_DATE_OUTSIDE_PERIOD': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.FIELD_NOT_EXTRACTED': { defaultOwner: 'RECYCLER' },
    'CROSS_VALIDATION.GENERATOR_ADDRESS_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.GENERATOR_TAX_ID_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.HAULER_TAX_ID_MISMATCH': { defaultOwner: 'TO_CONFIRM' },
    'CROSS_VALIDATION.ISSUE_DATE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF': { defaultOwner: 'TO_CONFIRM' },
    'CROSS_VALIDATION.RECEIVER_ADDRESS_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.RECEIVER_TAX_ID_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.RECEIVING_DATE_MISMATCH': { defaultOwner: 'TO_CONFIRM' },
    'CROSS_VALIDATION.RECYCLER_TAX_ID_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.TRANSPORT_DATE_MISMATCH': { defaultOwner: 'TO_CONFIRM' },
    'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'CROSS_VALIDATION.WASTE_QUANTITY_WEIGHT_MISMATCH': {
      defaultOwner: 'TO_CONFIRM',
    },
    'CROSS_VALIDATION.WASTE_TYPE_MISMATCH': { defaultOwner: 'TO_CONFIRM' },
    'DOCUMENT_EXTRACTION.EXTRACTION_FAILED': { defaultOwner: 'CARROT' },
    'DOCUMENT_EXTRACTION.LAYOUT_NOT_RECOGNIZED': { defaultOwner: 'INTEGRATOR' },
    'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD': { defaultOwner: 'RECYCLER' },
    'DOCUMENT_EXTRACTION.LOW_LAYOUT_MATCH_SCORE': { defaultOwner: 'CARROT' },
    'DOCUMENT_EXTRACTION.UNKNOWN_DOCUMENT_TYPE': { defaultOwner: 'CARROT' },
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'RESULT.ADDRESS_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'RESULT.ATTACHMENT_AND_JUSTIFICATION_PROVIDED': {
      defaultOwner: 'INTEGRATOR',
    },
    'RESULT.INCORRECT_ATTACHMENT_LABEL': { defaultOwner: 'INTEGRATOR' },
    'RESULT.INVALID_BR_DOCUMENT_TYPE': { defaultOwner: 'INTEGRATOR' },
    'RESULT.INVALID_ISSUE_DATE_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_ATTRIBUTES': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_DOCUMENT_NUMBER': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_DOCUMENT_TYPE': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_EVENT': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_ISSUE_DATE': { defaultOwner: 'INTEGRATOR' },
    'RESULT.MISSING_RECYCLER_EVENT': { defaultOwner: 'INTEGRATOR' },
    'RESULT.PROVIDE_EXEMPTION_JUSTIFICATION': { defaultOwner: 'CARROT' },
    'RESULT.VALID_ATTACHMENT_DECLARATION': { defaultOwner: 'CARROT' },
  },
);

const isKeyOf = <T extends object>(
  object: T,
  key: string,
): key is Extract<keyof T, string> => Object.hasOwn(object, key);

export const toCrossValidationFinding = ({
  code,
}: ReviewReason): RuleFinding => {
  if (isKeyOf(CROSS_VALIDATION_COMMENTS, code)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(`CROSS_VALIDATION.${code}`);
  }

  if (code.startsWith(LOW_CONFIDENCE_REASON_CODE_PREFIX)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
      'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
    );
  }

  if (isKeyOf(DOCUMENT_EXTRACTION_COMMENTS, code)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
      `DOCUMENT_EXTRACTION.${code}`,
    );
  }

  throw new Error(`Unknown cross-validation reason code "${code}"`);
};
