import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { MassIDOrganicSubtype } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleOutput,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue, stubRuleInput } from '@carrot-fndn/shared/testing';

import { MASS_ID_QUALIFICATIONS_FINDINGS } from './mass-id-qualifications.findings';
import { MassIDQualificationsProcessor } from './mass-id-qualifications.processor';
import { massIDQualificationsTestCases } from './mass-id-qualifications.test-cases';

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('MassIDQualificationsProcessor', () => {
  const ruleDataProcessor = new MassIDQualificationsProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

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
      massIDDocument: BoldDocument;
      resultComment: string;
      resultStatus: RuleOutputStatus;
    }) => {
      const ruleInput = stubRuleInput();

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(
        expectRuleFindings(ruleOutput, MASS_ID_QUALIFICATIONS_FINDINGS),
      ).toEqual(expectedRuleOutput);
    },
  );

  it('should return one finding per joined failure message in the same order', async () => {
    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments()
      .build();

    documentLoaderService.mockResolvedValueOnce({
      ...massIDDocument,
      subtype: 'INVALID_SUBTYPE',
      type: 'INVALID_TYPE',
    });

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

    expect(ruleOutput.resultContent?.['findings']).toEqual([
      MASS_ID_QUALIFICATIONS_FINDINGS.finding('FAILED.INVALID_TYPE'),
      MASS_ID_QUALIFICATIONS_FINDINGS.finding('FAILED.INVALID_SUBTYPE'),
    ]);
  });
});
