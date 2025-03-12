import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { MassSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { MassDefinitionProcessor } from './mass-definition.processor';
import { massDefinitionTestCases } from './mass-definition.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MassDefinitionProcessor', () => {
  const ruleDataProcessor = new MassDefinitionProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  describe('isValidSubtype', () => {
    it('should return false when subtype is undefined', () => {
      const result = ruleDataProcessor['isValidSubtype'](undefined);

      expect(result).toBe(false);
    });

    it('should return true when subtype is in MassSubtype enum', () => {
      const validSubtype = stubEnumValue(MassSubtype);
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

  it.each(massDefinitionTestCases)(
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
