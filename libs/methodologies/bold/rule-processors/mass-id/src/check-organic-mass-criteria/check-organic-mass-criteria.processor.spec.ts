import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { MassSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
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
  const documentLoaderService = jest.mocked(loadParentDocument);
  const processorErrors = new CheckOrganicMassCriteriaProcessorErrors();

  const massIdStubs = new BoldStubsBuilder().build();

  describe('isValidSubtype', () => {
    it('should return false when subtype is undefined', () => {
      const result = ruleDataProcessor['isValidSubtype'](undefined);

      expect(result).toBe(false);
    });

    it('should return true when subtype is in MassSubtype enum', () => {
      const validSubtype = Object.values(MassSubtype)[0];
      const result = ruleDataProcessor['isValidSubtype'](validSubtype);

      expect(result).toBe(true);
    });

    it('should return false when subtype is not in MassSubtype enum', () => {
      const result = ruleDataProcessor['isValidSubtype'](
        'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
      );

      expect(result).toBe(false);
    });
  });

  it.each([
    {
      massIdDocument: massIdStubs.massIdDocumentStub,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when all the criteria are met',
    },
    {
      massIdDocument: {
        ...massIdStubs.massIdDocumentStub,
        category: 'INVALID_CATEGORY',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].CATEGORY_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when category does not match',
    },
    {
      massIdDocument: {
        ...massIdStubs.massIdDocumentStub,
        type: 'INVALID_TYPE',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].TYPE_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when type is not ORGANIC',
    },
    {
      massIdDocument: {
        ...massIdStubs.massIdDocumentStub,
        measurementUnit: 'INVALID_UNIT',
      },
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].MEASUREMENT_UNIT_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when measurement unit is not KG',
    },
    {
      massIdDocument: {
        ...massIdStubs.massIdDocumentStub,
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
        ...massIdStubs.massIdDocumentStub,
        subtype: 'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
      },
      resultComment: ruleDataProcessor['RESULT_COMMENT'].SUBTYPE_NOT_MATCHING,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when subtype is defined but not in the allowed list',
    },
    {
      massIdDocument: { ...massIdStubs.massIdDocumentStub, type: undefined },
      resultComment: processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when document type is not found',
    },
    {
      massIdDocument: { ...massIdStubs.massIdDocumentStub, subtype: undefined },
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
