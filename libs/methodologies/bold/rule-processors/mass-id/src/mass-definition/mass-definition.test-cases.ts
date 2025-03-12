import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { MassDefinitionProcessorErrors } from './mass-definition.errors';
import { RESULT_COMMENTS } from './mass-definition.processor';

const massIdStubs = new BoldStubsBuilder().build();
const processorErrors = new MassDefinitionProcessorErrors();

export const massDefinitionTestCases = [
  {
    massIdDocument: massIdStubs.massIdDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: 'all the criteria are met',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      category: 'INVALID_CATEGORY',
    },
    resultComment: RESULT_COMMENTS.CATEGORY_NOT_MATCHING('INVALID_CATEGORY'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'category does not match',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      type: 'INVALID_TYPE',
    },
    resultComment: RESULT_COMMENTS.TYPE_NOT_MATCHING('INVALID_TYPE'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'type is not ORGANIC',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      measurementUnit: 'INVALID_UNIT',
    },
    resultComment:
      RESULT_COMMENTS.MEASUREMENT_UNIT_NOT_MATCHING('INVALID_UNIT'),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'measurement unit is not "kg"',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      currentValue: 0,
    },
    resultComment: RESULT_COMMENTS.CURRENT_VALUE_NOT_MATCHING(0),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'current value is not greater than 0',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      subtype: 'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    },
    resultComment: RESULT_COMMENTS.SUBTYPE_NOT_MATCHING(
      'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
    ),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'subtype is defined but not in the allowed list',
  },
  {
    massIdDocument: { ...massIdStubs.massIdDocumentStub, type: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'document type is not found',
  },
  {
    massIdDocument: { ...massIdStubs.massIdDocumentStub, subtype: undefined },
    resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'document subtype is not found',
  },
  {
    massIdDocument: {
      ...massIdStubs.massIdDocumentStub,
      subtype: 'INVALID_SUBTYPE',
      type: 'INVALID_TYPE',
    },
    resultComment: [
      RESULT_COMMENTS.TYPE_NOT_MATCHING('INVALID_TYPE'),
      RESULT_COMMENTS.SUBTYPE_NOT_MATCHING('INVALID_SUBTYPE'),
    ].join('. '),
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: 'there are multiple error messages',
  },
];
