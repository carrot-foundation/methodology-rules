import {
  stubCertificateAuditWithMethodologySlug,
  stubDocument,
  stubDocumentEvent,
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
import { stubMassValidationDocumentWithMethodologySlug } from './mass-validation-document.stubs';

describe('MassValidationDocumentProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const certificateId = faker.string.uuid();
  const methodologySlug = faker.string.uuid();

  const massValidationDocuments = stubArray(() =>
    stubMassValidationDocumentWithMethodologySlug(methodologySlug),
  );

  const certificateAudit = stubCertificateAuditWithMethodologySlug(
    methodologySlug,
    {
      parentDocumentId: certificateId,
    },
  );

  const certificate = stubDocument({
    externalEvents: massValidationDocuments.map((value) =>
      stubDocumentEvent({
        relatedDocument: {
          ...pick(value, 'category', 'type', 'subtype'),
          documentId: value.id,
        },
      }),
    ),
    id: certificateId,
    type: faker.string.sample(),
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document: certificateAudit,
        documentKey: toDocumentKey({
          documentId: certificateAudit.id,
          documentKeyPrefix,
        }),
      },
      {
        document: certificate,
        documentKey: toDocumentKey({
          documentId: certificateId,
          documentKeyPrefix,
        }),
      },
      ...massValidationDocuments.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    ]);
  });

  it('should return APPROVED when documents matches mass validation and have bold methodology slug', async () => {
    const response = await handler(
      stubRuleInput({
        documentId: certificateAudit.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
