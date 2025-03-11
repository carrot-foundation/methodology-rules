import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker/.';

import { massDefinitionLambda } from './mass-definition.lambda';

describe('MassDefinitionLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder().build();

  it.each([
    {
      massIdDocument: massId.massIdDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when all the criteria are met',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        category: 'INVALID_CATEGORY',
      },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when category does not match',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        type: 'INVALID_TYPE',
      },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when type is not ORGANIC',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        measurementUnit: 'INVALID_UNIT',
      },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when measurement unit is not KG',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        currentValue: 0,
      },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when current value is not greater than 0',
    },
    {
      massIdDocument: {
        ...massId.massIdDocumentStub,
        subtype: 'INVALID_SUBTYPE',
      },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when subtype is not in the allowed list',
    },
    {
      massIdDocument: { ...massId.massIdDocumentStub, type: undefined },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when document type is not found',
    },
    {
      massIdDocument: { ...massId.massIdDocumentStub, subtype: undefined },
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should return REJECTED when document subtype is not found',
    },
  ])('$scenario', async ({ massIdDocument, resultStatus }) => {
    prepareEnvironmentTestE2E(
      [massIdDocument, massId.massIdAuditDocumentStub].map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );

    const response = (await massDefinitionLambda(
      stubRuleInput({
        documentKeyPrefix,
        parentDocumentId: massIdDocument.id,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(resultStatus);
  });
});
