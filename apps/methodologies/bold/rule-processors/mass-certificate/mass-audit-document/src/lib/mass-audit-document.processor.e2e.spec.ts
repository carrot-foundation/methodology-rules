import {
  stubDocument,
  stubDocumentEvent,
  stubMassCertificateAuditWithMethodologySlug,
} from '@carrot-fndn/methodologies/bold/testing';
import { pick, toDocumentKey } from '@carrot-fndn/shared/helpers';
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
import { stubMassAuditDocumentWithMethodologySlug } from './mass-audit-document.stubs';

describe('MassAuditDocumentProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const massCertificateId = faker.string.uuid();
  const methodologySlug = faker.string.uuid();

  const massAuditDocuments = stubArray(() =>
    stubMassAuditDocumentWithMethodologySlug(methodologySlug),
  );

  const massCertificateAudit = stubMassCertificateAuditWithMethodologySlug(
    methodologySlug,
    {
      parentDocumentId: massCertificateId,
    },
  );

  const massCertificate = stubDocument({
    externalEvents: massAuditDocuments.map((value) =>
      stubDocumentEvent({
        relatedDocument: {
          ...pick(value, 'category', 'type', 'subtype'),
          documentId: value.id,
        },
      }),
    ),
    id: massCertificateId,
    type: faker.string.sample(),
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document: massCertificateAudit,
        documentKey: toDocumentKey({
          documentId: massCertificateAudit.id,
          documentKeyPrefix,
        }),
      },
      {
        document: massCertificate,
        documentKey: toDocumentKey({
          documentId: massCertificateId,
          documentKeyPrefix,
        }),
      },
      ...massAuditDocuments.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    ]);
  });

  it('should return APPROVED when documents matches mass audit and have bold methodology slug', async () => {
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
