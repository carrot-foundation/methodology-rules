import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker/.';

import { vehicleIdentificationLambda } from './vehicle-identification.lambda';
import { vehicleIdentificationTestCases } from './vehicle-identification.test-cases';

describe('VehicleIdentificationLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(vehicleIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ document, resultStatus }) => {
      prepareEnvironmentTestE2E([
        {
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        },
      ]);

      const response = (await vehicleIdentificationLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: document.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
