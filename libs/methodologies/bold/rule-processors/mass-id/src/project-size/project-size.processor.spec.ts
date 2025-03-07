import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { ProjectSizeProcessorErrors } from './project-size.errors';
import { ProjectSizeProcessor } from './project-size.processor';

const { BUSINESS_DOCUMENT } = DocumentEventName;
const { PROJECT_SIZE } = DocumentEventAttributeName;

describe('ProjectSizeProcessor', () => {
  const ruleDataProcessor = new ProjectSizeProcessor();
  const projectSizeProcessorErrors = new ProjectSizeProcessorErrors();

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
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
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
      resultComment: ruleDataProcessor['RESULT_COMMENT'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document contains a project size greater than 60,000',
    },
    {
      documents: [massIdAuditWithHomologations.massIdDocumentStub],
      massIdAuditDocumentStub:
        massIdAuditWithHomologations.massIdAuditDocumentStub,
      resultComment:
        projectSizeProcessorErrors.ERROR_MESSAGE
          .HOMOLOGATION_DOCUMENT_NOT_FOUND,
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
      resultComment:
        projectSizeProcessorErrors.ERROR_MESSAGE
          .HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_EVENTS,
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
      resultComment:
        projectSizeProcessorErrors.ERROR_MESSAGE
          .HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_PROJECT_SIZE,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the recycler homologation document does not contain a project size metadata attribute',
    },
  ])(
    '$scenario',
    async ({
      documents,
      massIdAuditDocumentStub,
      resultComment,
      resultStatus,
    }) => {
      spyOnDocumentQueryServiceLoad(stubDocument(), [
        massIdAuditDocumentStub,
        ...documents,
      ]);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocumentStub.id,
      };

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
