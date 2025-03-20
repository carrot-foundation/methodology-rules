import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { projectBoundaryLambda } from './project-boundary.lambda';
import { projectBoundaryTestCases } from './project-boundary.test-cases';

describe('ProjectBoundaryLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(projectBoundaryTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultContent, resultStatus }) => {
      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
        })
        .createMassIdAuditDocument()
        .build();

      prepareEnvironmentTestE2E(
        [massIdDocument, massIdAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await projectBoundaryLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIdDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response).toMatchObject({
        resultComment,
        resultContent,
        resultStatus,
      });
    },
  );
});
