import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './mass-id-qualifications.constants';
import { MassIDQualificationsProcessorErrors } from './mass-id-qualifications.errors';

const massIDStubs = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .build();
const processorErrors = new MassIDQualificationsProcessorErrors();

interface MassIDQualificationsTestCase extends RuleTestCase {
  massIDDocument: Document;
}

export const massIDQualificationsTestCases: MassIDQualificationsTestCase[] = [
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: massIDStubs.massIDDocument,
    resultComment: RESULT_COMMENTS.passed.VALID_QUALIFICATIONS,
    resultStatus: 'PASSED' as const,
    scenario: 'All the criteria are met',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      category: 'INVALID_CATEGORY',
    },
    resultComment: RESULT_COMMENTS.failed.INVALID_CATEGORY('INVALID_CATEGORY'),
    resultStatus: 'FAILED' as const,
    scenario: 'The category does not match',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      type: 'INVALID_TYPE',
    },
    resultComment: RESULT_COMMENTS.failed.INVALID_TYPE('INVALID_TYPE'),
    resultStatus: 'FAILED' as const,
    scenario: 'The type is not ORGANIC',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      measurementUnit: 'INVALID_UNIT',
    },
    resultComment:
      RESULT_COMMENTS.failed.INVALID_MEASUREMENT_UNIT('INVALID_UNIT'),
    resultStatus: 'FAILED' as const,
    scenario: 'The measurement unit is not "kg"',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      currentValue: 0,
    },
    resultComment: RESULT_COMMENTS.failed.INVALID_VALUE(0),
    resultStatus: 'FAILED' as const,
    scenario: 'The current value is not greater than 0',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      subtype: 'Invalid Subtype',
    },
    resultComment: RESULT_COMMENTS.failed.INVALID_SUBTYPE('Invalid Subtype'),
    resultStatus: 'FAILED' as const,
    scenario: 'The subtype is defined but not in the allowed list',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: { ...massIDStubs.massIDDocument, type: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
    resultStatus: 'FAILED' as const,
    scenario: 'The document type was not found',
  },
  {
    manifestExample: true,
    manifestFields: { includeCurrentValue: true },
    massIDDocument: { ...massIDStubs.massIDDocument, subtype: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
    resultStatus: 'FAILED' as const,
    scenario: 'The document subtype was not found',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      subtype: 'INVALID_SUBTYPE',
      type: 'INVALID_TYPE',
    },
    resultComment: [
      RESULT_COMMENTS.failed.INVALID_TYPE('INVALID_TYPE'),
      RESULT_COMMENTS.failed.INVALID_SUBTYPE('INVALID_SUBTYPE'),
    ].join(' '),
    resultStatus: 'FAILED' as const,
    scenario: 'Multiple errors were found',
  },
];
