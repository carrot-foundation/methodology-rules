import {
  stubCertificateDocument,
  stubDocumentEvent,
  stubMassDocument,
  stubMassValidationDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import { DocumentType } from '@carrot-fndn/methodologies/bold/types';
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
  const massValidation = stubMassValidationDocument({
    parentDocumentId: organicMass.id,
  });

  const certificate = stubCertificateDocument({
    externalEvents: [
      stubDocumentEvent({
        relatedDocument: {
          category: massValidation.category,
          documentId: massValidation.id,
          subtype: massValidation.subtype,
          type: massValidation.type,
        },
      }),
    ],
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document: certificate,
        documentKey: toDocumentKey({
          documentId: certificate.id,
          documentKeyPrefix,
        }),
      },
      {
        document: massValidation,
        documentKey: toDocumentKey({
          documentId: massValidation.id,
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

  it('should return returnStatus approved when all certificate documents matches type Organic', async () => {
    const response = await handler(
      stubRuleInput({
        documentKeyPrefix,
        parentDocumentId: certificate.id,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
