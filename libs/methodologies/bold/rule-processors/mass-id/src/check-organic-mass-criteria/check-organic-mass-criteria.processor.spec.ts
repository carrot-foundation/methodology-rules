import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CheckOrganicMassCriteriaProcessorErrors } from './check-organic-mass-criteria.errors';
import { CheckOrganicMassCriteriaProcessor } from './check-organic-mass-criteria.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('CheckOrganicMassCriteriaProcessor', () => {
  const ruleDataProcessor = new CheckOrganicMassCriteriaProcessor();
  const processorErrors = new CheckOrganicMassCriteriaProcessorErrors();

  const documentLoaderService = jest.mocked(loadParentDocument);

  const massId = new BoldStubsBuilder().build();

  it.each([
    {
      massIdDocument: massId.massIdDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when all the criteria are met',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        category: 'INVALID_CATEGORY',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].CATEGORY_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when category does not match',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        type: 'INVALID_TYPE',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].TYPE_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when type is not ORGANIC',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        measurementUnit: 'INVALID_UNIT',
      },
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].MEASUREMENT_UNIT_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when measurement unit is not KG',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        currentValue: 0,
      },
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].CURRENT_VALUE_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when current value is not greater than 0',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        subtype: 'INVALID_SUBTYPE',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].SUBTYPE_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when subtype is not in the allowed list',
    },
    {
      massIdDocument: { ...massId.massIdDocumentStub, type: undefined },
      resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when document type is not found',
    },
    {
      massIdDocument: { ...massId.massIdDocumentStub, subtype: undefined },
      resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_SUBTYPE_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when document subtype is not found',
    },
  ])(
    '$scenario',
    async ({
      massIdDocument,
      resultComment,
      resultStatus,
    }: {
      massIdDocument: Document;
      resultComment: string;
      resultStatus: RuleOutputStatus;
    }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
