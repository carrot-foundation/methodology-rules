import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassValidationDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MethodologyEvaluationResult,
} from '@carrot-fndn/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/methodologies/bold/utils';
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

describe('MassValidationDocumentStatusProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const parentDocumentId = faker.string.uuid();

  const { CLOSE } = DocumentEventName;
  const { METHODOLOGY_EVALUATION_RESULT } = DocumentEventAttributeName;
  const { APPROVED } = MethodologyEvaluationResult;

  const relatedDocumentsOfParentDocument = stubArray(() =>
    stubMassValidationDocument({
      externalEvents: [
        stubDocumentEventWithMetadataAttributes(
          {
            name: CLOSE,
            participant: {
              id: CARROT_PARTICIPANT_BY_ENVIRONMENT.development.id,
            },
          },
          [[METHODOLOGY_EVALUATION_RESULT, APPROVED]],
        ),
      ],
    }),
  );

  const document = stubDocument({
    parentDocumentId,
  });

  const parentDocument = stubDocument({
    externalEvents: relatedDocumentsOfParentDocument.map((value) =>
      stubDocumentEvent({
        relatedDocument: {
          ...pick(value, 'category', 'type', 'subtype'),
          documentId: value.id,
        },
      }),
    ),
    id: parentDocumentId,
    type: faker.string.sample(),
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      },
      {
        document: parentDocument,
        documentKey: toDocumentKey({
          documentId: parentDocumentId,
          documentKeyPrefix,
        }),
      },
      ...relatedDocumentsOfParentDocument.map((value) => ({
        document: value,
        documentKey: toDocumentKey({
          documentId: value.id,
          documentKeyPrefix,
        }),
      })),
    ]);
  });

  it('should return APPROVED when documents matches mass validation and have approved close event', async () => {
    const response = await handler(
      stubRuleInput({
        documentId: document.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    );

    expect(response).toMatchObject({ resultStatus: RuleOutputStatus.APPROVED });
  });
});
