import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentStatus } from '@carrot-fndn/shared/methodologies/bold/types';
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
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { creditAbsenceLambda } from './credit-absence.lambda';

describe('CheckTCCAbsenceProcessor E2E', () => {
  const lambda = creditAbsenceLambda(TRC_CREDIT_MATCH);
  const documentKeyPrefix = faker.string.uuid();

  const massIdWithCreditStubs = new BoldStubsBuilder().withCredits().build();
  const massIdWithoutCreditsStubs = new BoldStubsBuilder().build();
  const massIdWithMultipleCreditsStubs = new BoldStubsBuilder()
    .withCredits({
      count: 4,
    })
    .build();

  it.each([
    {
      documents: [massIdWithoutCreditsStubs.massIdDocumentStub],
      massIdAuditDocument: massIdWithoutCreditsStubs.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when no Credit is linked to the MassID',
    },
    {
      documents: [
        massIdWithCreditStubs.massIdDocumentStub,
        {
          ...(massIdWithCreditStubs.creditDocumentsStubs[0] as Document),
          status: DocumentStatus.CANCELLED,
        } as Document,
      ],
      massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there is a Credit linked to the MassID, but it is cancelled',
    },
    {
      documents: [
        massIdWithCreditStubs.massIdDocumentStub,
        ...massIdWithCreditStubs.creditDocumentsStubs,
      ],
      massIdAuditDocument: massIdWithCreditStubs.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when a no Cancelled Credit is linked to the MassID',
    },
    {
      documents: [
        massIdWithMultipleCreditsStubs.massIdDocumentStub,
        ...massIdWithMultipleCreditsStubs.creditDocumentsStubs.map(
          (creditDocumentStub) => ({
            ...creditDocumentStub,
            status: DocumentStatus.CANCELLED,
          }),
        ),
      ],
      massIdAuditDocument:
        massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there are more than one Credit linked to the MassID, but all are cancelled',
    },
    {
      documents: [
        massIdWithMultipleCreditsStubs.massIdDocumentStub,
        ...massIdWithMultipleCreditsStubs.creditDocumentsStubs.map(
          (creditDocumentStub, index) => ({
            ...creditDocumentStub,
            status:
              index === 0 ? random<NonEmptyString>() : DocumentStatus.CANCELLED,
          }),
        ),
      ],
      massIdAuditDocument:
        massIdWithMultipleCreditsStubs.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when there are more than one Credit linked to the MassID, but one is not cancelled',
    },
  ])('$scenario', async ({ documents, massIdAuditDocument, resultStatus }) => {
    prepareEnvironmentTestE2E(
      [...documents, massIdAuditDocument].map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );

    const response = (await lambda(
      stubRuleInput({
        documentId: massIdAuditDocument.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(resultStatus);
  });
});
