// No changes needed - imports are already correctly structured with:
// - DocumentEventName from '@carrot-fndn/shared/methodologies/bold/types'
// - Other imports remain unchanged

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassCertificateAuditDocument,
  stubMassCertificateDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubArray,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { handler } from '../lambda';
import {
  stubMassDocumentWithRequiredActors,
  stubMethodologyWithRequiredActors,
} from './rewards-distribution.stubs';

describe('RewardsDistributionProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const methodologyReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.DEFINITION,
  };

  const organicMasses = stubArray(() =>
    stubMassDocumentWithRequiredActors({
      subtype: DocumentSubtype.FOOD_WASTE,
    }),
  );
  const massAudits = organicMasses.map(({ id }) =>
    stubMassAuditDocument({
      parentDocumentId: id,
    }),
  );
  const methodologyDocument = stubMethodologyWithRequiredActors({
    id: methodologyReference.documentId,
  });
  const externalEvents = massAudits.map(({ category, id, subtype, type }) =>
    stubDocumentEvent({
      relatedDocument: {
        category,
        documentId: id,
        subtype,
        type,
      },
    }),
  );
  const massCertificate = stubMassCertificateDocument({
    externalEvents,
  });
  const massCertificateAudit = stubMassCertificateAuditDocument({
    externalEvents: [
      stubDocumentEvent({
        name: DocumentEventName.ACTOR,
        referencedDocument: methodologyReference,
        relatedDocument: undefined,
      }),
    ],
    parentDocumentId: massCertificate.id,
  });

  const documents = [
    massCertificate,
    massCertificateAudit,
    methodologyDocument,
    ...organicMasses,
    ...massAudits,
  ];

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

  it('should return resultStatus approved when all massCertificates containing mass documents are correct', async () => {
    const response = await handler(
      stubRuleInput({
        documentId: massCertificateAudit.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
