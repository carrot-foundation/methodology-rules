import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
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

const { ACTOR } = DocumentEventName;
const { RECYCLER } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;

describe('RecyclerActorDocumentProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const massCertificateId = faker.string.uuid();
  const recyclerId = faker.string.uuid();

  const massAuditDocuments = stubArray(
    () =>
      stubMassAuditDocument({
        parentDocumentId: faker.string.uuid(),
      }),
    { max: 10, min: 2 },
  );

  const massDocuments = massAuditDocuments.map((document) =>
    stubDocument({
      category: DocumentCategory.MASS,
      externalEvents: [
        stubDocumentEventWithMetadataAttributes(
          { name: ACTOR, participant: { id: recyclerId } },
          [[ACTOR_TYPE, RECYCLER]],
        ),
      ],
      id: String(document.parentDocumentId),
    }),
  );

  const massCertificateAudit = stubDocument({
    parentDocumentId: massCertificateId,
  });

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
      ...massDocuments.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    ]);
  });

  it('should return APPROVED when documents have the same participants declared as recycler', async () => {
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
