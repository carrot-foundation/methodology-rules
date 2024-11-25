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
import {
  stubApprovedWeighingMoveEvent,
  stubApprovedWeighingMoveEventAttributes,
} from './net-weight-verification.stubs';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

const { LOAD_NET_WEIGHT, VEHICLE_GROSS_WEIGHT, VEHICLE_WEIGHT } =
  DocumentEventAttributeName;

describe('NetWeightVerificationProcessor', () => {
  const ruleDataProcessor = new NetWeightVerificationProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubApprovedWeighingMoveEvent(),
          stubApprovedWeighingMoveEvent(),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'all the attributes with the correct values',
    },
    {
      document: stubDocument({
        externalEvents: [stubApprovedWeighingMoveEvent(undefined, 1)],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'load-net-weight approximate with a difference of 1 kg to vehicle-gross-weight minus vehicle-weight',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubApprovedWeighingMoveEvent(
            undefined,
            faker.number.float({ max: 0.99, min: 0 }),
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'load-net-weight approximate with a difference between 0 and 0,99 kg to vehicle-gross-weight minus vehicle-weight',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubApprovedWeighingMoveEvent(
            undefined,
            faker.number.float({ max: 100, min: 1.01 }),
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'load-net-weight not approximate with difference greater than 1 kg to vehicle-gross-weight minus vehicle-weight',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'no external events',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubApprovedWeighingMoveEvent(),
          replaceMetadataAttributeValue(
            stubApprovedWeighingMoveEvent(),
            VEHICLE_GROSS_WEIGHT,
            `${faker.number.int()}`,
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'one of the events has invalid attributes',
    },
    {
      document: stubDocument({
        externalEvents: [
          replaceMetadataAttributeValue(
            stubApprovedWeighingMoveEvent(),
            VEHICLE_GROSS_WEIGHT,
            `${faker.number.int()} KG`,
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'load-net-weight is not approximate to vehicle-gross-weight minus vehicle-weight',
    },
    ...[VEHICLE_WEIGHT, VEHICLE_GROSS_WEIGHT, LOAD_NET_WEIGHT].map(
      (attributeName) => ({
        document: stubDocument({
          externalEvents: [
            replaceMetadataAttributeValue(
              stubApprovedWeighingMoveEvent(),
              attributeName,
              `${faker.number.int()}`,
            ),
          ],
        }),
        resultStatus: RuleOutputStatus.REJECTED,
        scenario: `the ${attributeName} attribute is missing the measurement unit`,
      }),
    ),
    ...[VEHICLE_WEIGHT, VEHICLE_GROSS_WEIGHT, LOAD_NET_WEIGHT].map(
      (attributeName) => ({
        document: stubDocument({
          externalEvents: [
            replaceMetadataAttributeValue(
              stubApprovedWeighingMoveEvent(),
              attributeName,
              'undefined KG',
            ),
          ],
        }),
        resultStatus: RuleOutputStatus.REJECTED,
        scenario: `the ${attributeName} attribute is not in the correct format`,
      }),
    ),
    ...[VEHICLE_WEIGHT, VEHICLE_GROSS_WEIGHT, LOAD_NET_WEIGHT].map(
      (attributeName) => ({
        document: stubDocument({
          externalEvents: [
            {
              ...stubApprovedWeighingMoveEvent(),
              metadata: {
                attributes: stubApprovedWeighingMoveEventAttributes().filter(
                  ({ name }) => name !== attributeName,
                ),
              },
            },
          ],
        }),
        resultStatus: RuleOutputStatus.APPROVED,
        scenario: `the ${attributeName} attribute is not present`,
      }),
    ),
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
        resultComment: expect.any(String),
        resultContent: undefined,
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
