import {
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassCertificateAuditDocument,
  stubMassCertificateDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentCategory,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubArray,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
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
        name: MethodologyDocumentEventName.ACTOR,
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
