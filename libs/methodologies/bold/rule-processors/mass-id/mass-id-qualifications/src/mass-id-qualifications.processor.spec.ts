import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { MassIDOrganicSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassIDQualificationsProcessor } from './mass-id-qualifications.processor';
import { massIDQualificationsTestCases } from './mass-id-qualifications.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MassIDQualificationsProcessor', () => {
  const ruleDataProcessor = new MassIDQualificationsProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  describe('isValidSubtype', () => {
    it('should return false when subtype is undefined', () => {
      const result = ruleDataProcessor['isValidSubtype'](undefined);

      expect(result).toBe(false);
    });

    it('should return true when subtype is in MassIDOrganicSubtype enum', () => {
      const validSubtype = stubEnumValue(MassIDOrganicSubtype);
      const result = ruleDataProcessor['isValidSubtype'](validSubtype);

      expect(result).toBe(true);
    });

    it('should return false when subtype is not in MassIDOrganicSubtype enum', () => {
      const result = ruleDataProcessor['isValidSubtype'](
        'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
      );

      expect(result).toBe(false);
    });
  });

  it.each(massIDQualificationsTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      massIDDocument,
      resultComment,
      resultStatus,
    }: {
      massIDDocument: Document;
      resultComment: string;
      resultStatus: RuleOutputStatus;
    }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

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
