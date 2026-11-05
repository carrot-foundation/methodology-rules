import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
  stubBoldMassIDPickUpEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NO_ELIGIBLE_SUBTYPE } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  type RuleOutput,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue, stubRuleInput } from '@carrot-fndn/shared/testing';
import { type AnyObject } from '@carrot-fndn/shared/types';

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
      resultContent,
      resultStatus,
    }: {
      massIDDocument: BoldDocument;
      resultComment: string;
      resultContent?: AnyObject;
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
        ...(resultContent && { resultContent }),
      };

      expect(
        expectRuleFindings(ruleOutput, MASS_ID_QUALIFICATIONS_FINDINGS),
      ).toEqual(expectedRuleOutput);
    },
  );

  it.each([
    {
      cdmCode: '8.3',
      expectedSubtype: `${MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES} | ${MassIDOrganicSubtype.TOBACCO}`,
      localWasteClassificationId: '02 01 03',
      scenario: 'the subtype the classification code expects',
    },
    {
      cdmCode: '8.2',
      expectedSubtype: NO_ELIGIBLE_SUBTYPE,
      localWasteClassificationId: '20 01 01',
      scenario: 'no eligible subtype for a non-organic CDM category',
    },
  ])(
    'should report $scenario as evidence of an invalid subtype',
    async ({ cdmCode, expectedSubtype, localWasteClassificationId }) => {
      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: {
            [BoldDocumentEventName.PICK_UP]: stubBoldMassIDPickUpEvent({
              metadataAttributes: [
                [
                  BoldAttributeName.LOCAL_WASTE_CLASSIFICATION_ID,
                  localWasteClassificationId,
                ],
              ],
            }),
          },
        })
        .build();

      documentLoaderService.mockResolvedValueOnce({
        ...massIDDocument,
        subtype: 'Unlisted Subtype',
      });

      const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

      expect(ruleOutput.resultContent?.['crossValidation']).toEqual({
        cdmCode,
        expectedSubtype,
        localWasteClassificationId,
        subtype: 'Unlisted Subtype',
      });
    },
  );

  it('should report only the received subtype when the pick-up has no classification code', async () => {
    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments()
      .build();

    documentLoaderService.mockResolvedValueOnce({
      ...massIDDocument,
      externalEvents: massIDDocument.externalEvents?.filter(
        ({ name }) => name !== BoldDocumentEventName.PICK_UP.toString(),
      ),
      subtype: 'Unlisted Subtype',
    });

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

    expect(ruleOutput.resultContent?.['crossValidation']).toStrictEqual({
      subtype: 'Unlisted Subtype',
    });
  });

  it('should attach no subtype evidence when the subtype is valid', async () => {
    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments()
      .build();

    documentLoaderService.mockResolvedValueOnce({
      ...massIDDocument,
      type: 'INVALID_TYPE',
    });

    const ruleOutput = await ruleDataProcessor.process(stubRuleInput());

    expect(ruleOutput.resultContent).not.toHaveProperty('crossValidation');
  });

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
