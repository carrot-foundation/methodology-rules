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

import { projectPeriodLambda } from './project-period.lambda';
import { projectPeriodTestCases } from './project-period.test-cases';

const { RECYCLED } = DocumentEventName;

describe('ProjectPeriodLambda E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(projectPeriodTestCases)(
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

      const response = (await projectPeriodLambda(
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
