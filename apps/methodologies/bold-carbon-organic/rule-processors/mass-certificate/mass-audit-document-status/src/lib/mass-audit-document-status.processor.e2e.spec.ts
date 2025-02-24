import { pick, toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubArray,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import {
  DataSetName,
  MethodologyEvaluationResult,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { handler } from '../lambda';

describe('MassAuditDocumentStatusProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const parentDocumentId = faker.string.uuid();

  const { CLOSE } = DocumentEventName;
  const { METHODOLOGY_EVALUATION_RESULT } = DocumentEventAttributeName;
  const { APPROVED } = MethodologyEvaluationResult;
  const dataSetName = random<DataSetName>();

  const document = stubDocument({
    dataSetName,
    parentDocumentId,
  });

  const relatedDocumentsOfParentDocument = stubArray(() =>
    stubMassAuditDocument({
      dataSetName,
      externalEvents: [
        stubDocumentEventWithMetadataAttributes(
          {
            name: CLOSE,
            participant: {
              id: CARROT_PARTICIPANT_BY_ENVIRONMENT.development[
                document.dataSetName
              ].id,
            },
          },
          [[METHODOLOGY_EVALUATION_RESULT, APPROVED]],
        ),
      ],
    }),
  );

  const parentDocument = stubDocument({
    dataSetName,
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

  it('should return APPROVED when documents matches mass audit and have approved close event', async () => {
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
