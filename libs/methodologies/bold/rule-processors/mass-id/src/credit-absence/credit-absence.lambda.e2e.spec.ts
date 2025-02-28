import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  stubMassAuditDocument,
  stubMassDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
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

import { creditAbsenceLambda } from './credit-absence.lambda';

describe('CheckTCCAbsenceProcessor', () => {
  const lambda = creditAbsenceLambda(TRC_CREDIT_MATCH);
  const documentKeyPrefix = faker.string.uuid();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const massId = faker.string.uuid();
  const massAuditId = faker.string.uuid();

  const massReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massId,
    type: DocumentType.ORGANIC,
  };
  const massAuditReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: massAuditId,
    subtype: DocumentSubtype.PROCESS,
    type: DocumentType.MASS_AUDIT,
  };
  const massDocumentStub = stubMassDocument({
    id: massReference.documentId,
  });
  const massAuditDocumentStub = stubMassAuditDocument({
    id: massAuditReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });

  const documents: Document[] = [massAuditDocumentStub, massDocumentStub];

  beforeAll(() => {
    prepareEnvironmentTestE2E(
      documents.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );
  });

  it('should return APPROVED when the MassID has no TCC linked', async () => {
    const response = (await lambda(
      stubRuleInput({
        documentId: massAuditReference.documentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(RuleOutputStatus.APPROVED);
  });
});
