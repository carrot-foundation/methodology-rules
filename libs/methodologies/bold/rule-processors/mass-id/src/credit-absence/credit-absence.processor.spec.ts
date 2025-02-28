import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  stubCreditDocument,
  stubDocument,
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventName,
  type DocumentReference,
  DocumentStatus,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { assert, random } from 'typia';

import { CreditAbsenceProcessor } from './credit-absence.processor';
import { CreditAbsenceProcessorErrors } from './credit-absence.processor.errors';

describe('CreditAbsenceProcessor', () => {
  const ruleDataProcessor = new CreditAbsenceProcessor(TRC_CREDIT_MATCH);
  const processorError = new CreditAbsenceProcessorErrors();

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
  const validTCCReferences: DocumentReference[] = stubArray(() => ({
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.TRC,
    type: DocumentType.CREDIT,
  }));
  const cancelledTCCReferences: DocumentReference[] = stubArray(() => ({
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.TRC,
    type: DocumentType.CREDIT,
  }));
  const validTCCDocumentsStubs: Map<string, Document> = new Map(
    validTCCReferences.map((reference) => [
      reference.documentId,
      stubCreditDocument({
        id: reference.documentId,
        subtype: reference.subtype,
      }),
    ]),
  );
  const cancelledTCCDocumentsStubs: Map<string, Document> = new Map(
    cancelledTCCReferences.map((reference) => [
      reference.documentId,
      stubCreditDocument({
        id: reference.documentId,
        status: DocumentStatus.CANCELLED,
        subtype: reference.subtype,
      }),
    ]),
  );
  const massDocumentStub = stubMassDocument({
    id: massReference.documentId,
  });
  const massAuditDocumentStub = stubMassAuditDocument({
    id: massAuditReference.documentId,
    parentDocumentId: massDocumentStub.id,
  });

  it.each([
    {
      documents: [massDocumentStub],
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'should return APPROVED when no Credit is linked to the MassID',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            stubDocumentEvent({
              name: DocumentEventName.RELATED,
              relatedDocument: cancelledTCCReferences[0],
            }),
          ],
        },
        cancelledTCCDocumentsStubs.get(
          cancelledTCCReferences[0]!.documentId,
        ) as Document,
      ],
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there is a Credit linked to the MassID, but it is cancelled',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            stubDocumentEvent({
              name: DocumentEventName.RELATED,
              relatedDocument: validTCCReferences[0],
            }),
          ],
        },
        validTCCDocumentsStubs.get(
          validTCCReferences[0]!.documentId,
        ) as Document,
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
          assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when a no Cancelled Credit is linked to the MassID',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            ...cancelledTCCReferences.map((reference) =>
              stubDocumentEvent({
                name: DocumentEventName.RELATED,
                relatedDocument: reference,
              }),
            ),
          ],
        },
        ...cancelledTCCDocumentsStubs.values(),
      ],
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when there are more than one Credit linked to the MassID, but all are cancelled',
    },
    {
      documents: [
        {
          ...massDocumentStub,
          externalEvents: [
            ...(massDocumentStub.externalEvents ?? []),
            stubDocumentEvent({
              name: DocumentEventName.RELATED,
              relatedDocument: validTCCReferences[0],
            }),
            ...cancelledTCCReferences.map((reference) =>
              stubDocumentEvent({
                name: DocumentEventName.RELATED,
                relatedDocument: reference,
              }),
            ),
          ],
        },
        validTCCDocumentsStubs.get(
          validTCCReferences[0]!.documentId,
        ) as Document,
        ...cancelledTCCDocumentsStubs.values(),
      ],
      resultComment:
        processorError.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT(
          assert<NonEmptyString>(TRC_CREDIT_MATCH.match.subtype),
        ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when there are more than one Credit linked to the MassID, but one is not cancelled',
    },
  ])('$scenario', async ({ documents, resultComment, resultStatus }) => {
    spyOnDocumentQueryServiceLoad(stubDocument(), [
      massAuditDocumentStub,
      ...documents,
    ]);

    const ruleInput = {
      ...random<Required<RuleInput>>(),
      documentId: massAuditId,
    };

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
