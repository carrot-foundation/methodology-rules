import type { MethodologyRuleResponse } from '@carrot-fndn/shared/lambda/types';
import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import type { Handler } from 'aws-lambda';

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { approvedMassDocument, rejectedMassDocument } from '../documents';

process.env = {
  ...process.env,
  AWS_ACCESS_KEY_ID: faker.string.uuid(),
  AWS_SECRET_ACCESS_KEY: faker.string.uuid(),
};

export const testRuleProcessorWithMassDocuments = (
  options: {
    handler: Handler<RuleInput, MethodologyRuleResponse>;
    ruleName: string;
    skipRejectTest?: boolean;
  },
  extraTests?: (
    environmentOptions: {
      document: Document;
      documentKey: string;
    }[],
  ) => void,
) => {
  const { handler, ruleName, skipRejectTest = false } = options;

  describe(`E2E - ${ruleName} with pre-defined documents`, () => {
    const approvedMassDocumentScenario =
      'return expected resultStatus for the approvedMassDocument';
    const rejectedMassDocumentScenario =
      'not return expected resultStatus for the rejectedMassDocument';

    const documentKeyPrefix = faker.string.uuid();

    const MASS_DOCUMENT_SCENARIOS = [
      {
        document: approvedMassDocument,
        parentDocumentId: faker.string.uuid(),
        scenario: approvedMassDocumentScenario,
      },
      {
        document: rejectedMassDocument,
        parentDocumentId: faker.string.uuid(),
        scenario: rejectedMassDocumentScenario,
      },
    ];

    const environmentOptions = MASS_DOCUMENT_SCENARIOS.map(
      ({ document, parentDocumentId }) => ({
        document,
        documentKey: toDocumentKey({
          documentId: parentDocumentId,
          documentKeyPrefix,
        }),
      }),
    );

    beforeAll(() => {
      prepareEnvironmentTestE2E(environmentOptions);
    });

    it.each(MASS_DOCUMENT_SCENARIOS)('should $scenario', async (item) => {
      const response = await handler(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: item.parentDocumentId,
        }),
        stubContext(),
        () => stubRuleResponse(),
      );

      if (item.scenario === approvedMassDocumentScenario) {
        expect(response).toMatchObject({
          resultStatus: RuleOutputStatus.APPROVED,
        });
      } else if (!skipRejectTest) {
        expect(response).toMatchObject({
          resultStatus: RuleOutputStatus.REJECTED,
        });
      }
    });

    extraTests?.(environmentOptions);
  });
};
