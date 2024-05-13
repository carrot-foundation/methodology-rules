import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/testing';
import { MeasurementUnit } from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentMeasurementUnitProcessor } from './document-measurement-unit.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('DocumentMeasurementUnitProcessor', () => {
  const ruleDataProcessor = new DocumentMeasurementUnitProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it('should return APPROVED when measurement unit is KG', async () => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({ measurementUnit: MeasurementUnit.KG });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.APPROVED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });

  it('should return REJECTED when document is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: `Could not load the document with id ${ruleInput.parentDocumentId}`,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
