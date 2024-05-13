import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { replaceMetadataAttributeValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { NetWeightVerificationProcessor } from './net-weight-verification.processor';
import { stubWeighingMoveEvent } from './net-weight-verification.stubs';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('NetWeightVerificationProcessor', () => {
  const ruleDataProcessor = new NetWeightVerificationProcessor();
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
      document: random<Omit<Document, 'externalEvents'>>(),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'no external events',
    },
    {
      document: stubDocument({
        externalEvents: [
          replaceMetadataAttributeValue(
            stubWeighingMoveEvent(),
            DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
            '12.00 KG',
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'load-net-weight is not equal to vehicle-gross-weight minus vehicle-weight',
    },
    ...[
      DocumentEventAttributeName.VEHICLE_WEIGHT,
      DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
      DocumentEventAttributeName.LOAD_NET_WEIGHT,
    ].map((attributeName) => ({
      document: stubDocument({
        externalEvents: [
          replaceMetadataAttributeValue(
            stubWeighingMoveEvent(),
            attributeName,
            `${faker.number.int()}`,
          ),
        ],
      }),

      resultStatus: RuleOutputStatus.REJECTED,
      scenario: `the ${attributeName} attribute is not in the correct format`,
    })),
  ])(
    `should return $resultStatus when the document has $scenario`,
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
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
