import {
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassCertificateDocument,
  stubMassDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { DocumentType } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { handler } from '../lambda';

describe('MassDocumentTypeRuleProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const organicMass = stubMassDocument({
    type: DocumentType.ORGANIC,
  });
  const massAudit = stubMassAuditDocument({
    parentDocumentId: organicMass.id,
  });

  const massCertificate = stubMassCertificateDocument({
    externalEvents: [
      stubDocumentEvent({
        relatedDocument: {
          category: massAudit.category,
          documentId: massAudit.id,
          subtype: massAudit.subtype,
          type: massAudit.type,
        },
      }),
    ],
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document: massCertificate,
        documentKey: toDocumentKey({
          documentId: massCertificate.id,
          documentKeyPrefix,
        }),
      },
      {
        document: massAudit,
        documentKey: toDocumentKey({
          documentId: massAudit.id,
          documentKeyPrefix,
        }),
      },
      {
        document: organicMass,
        documentKey: toDocumentKey({
          documentId: organicMass.id,
          documentKeyPrefix,
        }),
      },
    ]);
  });

  it('should return returnStatus approved when all mass certificate documents matches type Organic', async () => {
    const response = await handler(
      stubRuleInput({
        documentKeyPrefix,
        parentDocumentId: massCertificate.id,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
