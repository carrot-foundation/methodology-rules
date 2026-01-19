import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { MassIDQualificationsProcessorErrors } from './mass-id-qualifications.errors';
import { RESULT_COMMENTS } from './mass-id-qualifications.processor';

const massIDStubs = new BoldStubsBuilder()
  .createMassIDDocuments()
  .createMassIDAuditDocuments()
  .build();
const processorErrors = new MassIDQualificationsProcessorErrors();

export const massIDQualificationsTestCases = [
  {
    massIDDocument: massIDStubs.massIDDocument,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'all the criteria are met',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      category: 'INVALID_CATEGORY',
    },
    resultComment: RESULT_COMMENTS.INVALID_CATEGORY('INVALID_CATEGORY'),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'category does not match',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      type: 'INVALID_TYPE',
    },
    resultComment: RESULT_COMMENTS.INVALID_TYPE('INVALID_TYPE'),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'type is not ORGANIC',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      measurementUnit: 'INVALID_UNIT',
    },
    resultComment: RESULT_COMMENTS.INVALID_MEASUREMENT_UNIT('INVALID_UNIT'),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'measurement unit is not "kg"',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      currentValue: 0,
    },
    resultComment: RESULT_COMMENTS.INVALID_VALUE(0),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'current value is not greater than 0',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      subtype: 'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    },
    resultComment: RESULT_COMMENTS.INVALID_SUBTYPE(
      'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    ),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'subtype is defined but not in the allowed list',
  },
  {
    massIDDocument: { ...massIDStubs.massIDDocument, type: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'document type is not found',
  },
  {
    massIDDocument: { ...massIDStubs.massIDDocument, subtype: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'document subtype is not found',
  },
  {
    massIDDocument: {
      ...massIDStubs.massIDDocument,
      subtype: 'INVALID_SUBTYPE',
      type: 'INVALID_TYPE',
    },
    resultComment: [
      RESULT_COMMENTS.INVALID_TYPE('INVALID_TYPE'),
      RESULT_COMMENTS.INVALID_SUBTYPE('INVALID_SUBTYPE'),
    ].join(' '),
    resultStatus: RuleOutputStatus.FAILED,
    scenario: 'there are multiple error messages',
  },
];
