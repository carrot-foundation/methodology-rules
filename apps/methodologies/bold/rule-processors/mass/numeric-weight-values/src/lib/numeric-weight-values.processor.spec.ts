import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { DocumentEventAttributeName } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { replaceMetadataAttributeValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { NumericWeightValuesProcessor } from './numeric-weight-values.processor';
import { stubWeighingMoveEvent } from './numeric-weight-values.stubs';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('NumericWeightValuesProcessor', () => {
  const ruleDataProcessor = new NumericWeightValuesProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [stubWeighingMoveEvent()],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'all the attributes with the correct values',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'no events with weight attributes',
    },
    ...[
      DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
      DocumentEventAttributeName.LOAD_NET_WEIGHT,
      DocumentEventAttributeName.VEHICLE_WEIGHT,
    ].map((attributeName) => ({
      document: stubDocument({
        externalEvents: [
          replaceMetadataAttributeValue(
            stubWeighingMoveEvent(),
            attributeName,
            faker.number.int(),
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: `an event with the attribute ${attributeName} has an incorrectly formatted value`,
    })),
  ])(
    `should return $resultStatus when the document contains $scenario`,
    async ({ document, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  it('should return REJECTED if there is no document', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
