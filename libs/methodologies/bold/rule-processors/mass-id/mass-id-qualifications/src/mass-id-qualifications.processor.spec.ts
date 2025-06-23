import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { MassIdOrganicSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassIdQualificationsProcessor } from './mass-id-qualifications.processor';
import { massIdQualificationsTestCases } from './mass-id-qualifications.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MassIdQualificationsProcessor', () => {
  const ruleDataProcessor = new MassIdQualificationsProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  describe('isValidSubtype', () => {
    it('should return false when subtype is undefined', () => {
      const result = ruleDataProcessor['isValidSubtype'](undefined);

      expect(result).toBe(false);
    });

    it('should return true when subtype is in MassIdOrganicSubtype enum', () => {
      const validSubtype = stubEnumValue(MassIdOrganicSubtype);
      const result = ruleDataProcessor['isValidSubtype'](validSubtype);

      expect(result).toBe(true);
    });

    it('should return false when subtype is not in MassIdOrganicSubtype enum', () => {
      const result = ruleDataProcessor['isValidSubtype'](
        'THIS_IS_DEFINITELY_NOT_IN_MASS_SUBTYPE_ENUM',
      );

      expect(result).toBe(false);
    });
  });

  it.each(massIdQualificationsTestCases)(
    'should return $resultStatus when $scenario',
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
