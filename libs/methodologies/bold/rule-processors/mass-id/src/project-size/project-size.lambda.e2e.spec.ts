import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { projectSizeLambda } from './project-size.lambda';

const { BUSINESS_DOCUMENT } = DocumentEventName;
const { PROJECT_SIZE } = DocumentEventAttributeName;

describe('ProjectSizeProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massIdAuditWithHomologations = new BoldStubsBuilder()
    .createMethodologyDocuments()
    .createParticipantHomologationDocuments()
    .build();

  it.each([
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
          DocumentSubtype.RECYCLER,
        )!,
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the recycler homologation document contains a project size less than 60,000',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        {
          ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
            DocumentSubtype.RECYCLER,
          )!,
          externalEvents: [
            stubDocumentEventWithMetadataAttributes(
              { name: BUSINESS_DOCUMENT },
              [[PROJECT_SIZE, 60_001]],
            ),
          ],
        },
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document contains a project size greater than 60,000',
    },
    {
      documents: [massIdAuditWithHomologations.massIdDocumentStub],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document is not found',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        {
          ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
            DocumentSubtype.RECYCLER,
          )!,
          externalEvents: [],
        },
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document does not contain events',
    },
    {
      documents: [
        massIdAuditWithHomologations.massIdDocumentStub,
        {
          ...massIdAuditWithHomologations.participantsHomologationDocumentStubs.get(
            DocumentSubtype.RECYCLER,
          )!,
          externalEvents: [
            stubDocumentEventWithMetadataAttributes({
              name: BUSINESS_DOCUMENT,
            }),
          ],
        },
      ],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document does not contain a project size metadata attribute',
    },
  ])(
    '$scenario',
    async ({ documents, massIdAuditDocumentStub, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [...documents, massIdAuditDocumentStub].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await projectSizeLambda(
        stubRuleInput({
          documentId: massIdAuditDocumentStub.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
