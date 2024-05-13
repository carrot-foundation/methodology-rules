import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassValidationDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
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
  const certificateId = faker.string.uuid();
  const recyclerId = faker.string.uuid();

  const massValidationDocuments = stubArray(
    () =>
      stubMassValidationDocument({
        parentDocumentId: faker.string.uuid(),
      }),
    { max: 10, min: 2 },
  );

  const massDocuments = massValidationDocuments.map((document) =>
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

  const certificateAudit = stubDocument({
    parentDocumentId: certificateId,
  });

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
        documentId: certificateAudit.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
