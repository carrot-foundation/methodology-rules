import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { projectPeriodLimitLambda } from './project-period-limit.lambda';
import { projectPeriodLimitTestCases } from './project-period-limit.test-cases';

const { RECYCLED } = DocumentEventName;

describe('ProjectPeriodLimitLambda E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(projectPeriodLimitTestCases)(
    'should return $resultStatus when $scenario',
    async ({ externalCreatedAt, resultComment, resultStatus }) => {
      const massIdDocument = stubBoldMassIdDocument({
        externalEventsMap: new Map([
          [
            RECYCLED,
            stubBoldMassIdRecycledEvent({
              partialDocumentEvent: externalCreatedAt
                ? { externalCreatedAt }
                : {},
            }),
          ],
        ]),
      });

      prepareEnvironmentTestE2E(
        [massIdDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await projectPeriodLimitLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIdDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
