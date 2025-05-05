import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { MassDefinitionProcessorErrors } from './mass-definition.errors';
import { RESULT_COMMENTS } from './mass-definition.processor';

const massIdStubs = new BoldStubsBuilder()
  .createMassIdDocuments()
  .createMassIdAuditDocuments()
  .build();
const processorErrors = new MassDefinitionProcessorErrors();

export const massDefinitionTestCases = [
  {
    massIdDocument: massIdStubs.massIdDocument,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'all the criteria are met',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      category: 'INVALID_CATEGORY',
    },
    resultComment: RESULT_COMMENTS.INVALID_CATEGORY('INVALID_CATEGORY'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'category does not match',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      type: 'INVALID_TYPE',
    },
    resultComment: RESULT_COMMENTS.INVALID_TYPE('INVALID_TYPE'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'type is not ORGANIC',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      measurementUnit: 'INVALID_UNIT',
    },
    resultComment: RESULT_COMMENTS.INVALID_MEASUREMENT_UNIT('INVALID_UNIT'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'measurement unit is not "kg"',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      currentValue: 0,
    },
    resultComment: RESULT_COMMENTS.INVALID_VALUE(0),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'current value is not greater than 0',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      subtype: 'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    },
    resultComment: RESULT_COMMENTS.INVALID_SUBTYPE(
      'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'subtype is defined but not in the allowed list',
  },
  {
    massIdDocument: { ...massIdStubs.massIdDocument, type: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'document type is not found',
  },
  {
    massIdDocument: { ...massIdStubs.massIdDocument, subtype: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'document subtype is not found',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocument,
      subtype: 'INVALID_SUBTYPE',
      type: 'INVALID_TYPE',
    },
    resultComment: [
      RESULT_COMMENTS.INVALID_TYPE('INVALID_TYPE'),
      RESULT_COMMENTS.INVALID_SUBTYPE('INVALID_SUBTYPE'),
    ].join(' '),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'there are multiple error messages',
  },
];
