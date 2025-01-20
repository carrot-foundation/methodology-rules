import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { replaceMetadataAttributeValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { WeighingFieldsProcessor } from './weighing-fields.processor';
import { stubWeighingMoveEvent } from './weighing-fields.stubs';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('WeighingFieldsProcessor', () => {
  const ruleDataProcessor = new WeighingFieldsProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [stubWeighingMoveEvent()],
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'all the attributes with the correct values',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'no events with Weighting move-type',
    },
    ...[
      DocumentEventAttributeName.WEIGHT_SCALE_TYPE,
      DocumentEventAttributeName.WEIGHT_SCALE_MANUFACTURER,
      DocumentEventAttributeName.WEIGHT_SCALE_MODEL,
      DocumentEventAttributeName.WEIGHT_SCALE_SOFTWARE,
      DocumentEventAttributeName.WEIGHT_SCALE_SUPPLIER,
    ].map((attributeName) => ({
      document: stubDocument({
        externalEvents: [
          replaceMetadataAttributeValue(
            stubWeighingMoveEvent(),
            attributeName,
            '',
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: `the ${attributeName} value is empty`,
    })),
  ])(
    `should return $resultStatus when the document has $scenario`,
    async ({ document, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(document);

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
