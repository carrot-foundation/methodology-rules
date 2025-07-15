import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import { AnyObject, MethodologyParticipant } from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { BoldStubsBuilder, type StubBoldDocumentParameters } from '../builders';

interface CreateBoldStubsParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIdDocumentsParams?: StubBoldDocumentParameters | undefined;
}

interface ProcessRuleTestParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIdDocumentsParams?: StubBoldDocumentParameters | undefined;
  ruleDataProcessor: RuleDataProcessor;
  spyOnDocumentQueryServiceLoad: (
    rootDocument: Document,
    documents: Document[],
  ) => void;
}

interface TestExpectedRuleOutputParameters {
  resultComment: string;
  resultContent?: AnyObject | undefined;
  resultStatus: string;
  ruleInput: RuleInput;
  ruleOutput: RuleOutput;
}

export function createBoldStubsForMassIdProcessor({
  accreditationDocuments,
  massIdActorParticipants,
  massIdDocumentsParams,
}: CreateBoldStubsParameters) {
  return new BoldStubsBuilder({
    ...(massIdActorParticipants && { massIdActorParticipants }),
  })
    .createMassIdDocuments(massIdDocumentsParams)
    .createMassIdAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(accreditationDocuments)
    .build();
}

export async function createRuleTestFixture({
  accreditationDocuments,
  massIdActorParticipants,
  massIdDocumentsParams,
  ruleDataProcessor,
  spyOnDocumentQueryServiceLoad,
}: ProcessRuleTestParameters): Promise<{
  ruleInput: RuleInput;
  ruleOutput: RuleOutput;
}> {
  const {
    massIdAuditDocument,
    massIdDocument,
    participantsAccreditationDocuments,
  } = createBoldStubsForMassIdProcessor({
    accreditationDocuments,
    massIdActorParticipants,
    massIdDocumentsParams,
  });

  const allDocuments = [
    massIdDocument,
    massIdAuditDocument,
    ...participantsAccreditationDocuments.values(),
  ];

  spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

  const ruleInput = {
    ...random<Required<RuleInput>>(),
    documentId: massIdAuditDocument.id,
  };

  return { ruleInput, ruleOutput: await ruleDataProcessor.process(ruleInput) };
}

export function expectRuleOutput({
  resultComment,
  resultContent,
  resultStatus,
  ruleInput,
  ruleOutput,
}: TestExpectedRuleOutputParameters): void {
  expect(ruleOutput).toEqual({
    requestId: ruleInput.requestId,
    responseToken: ruleInput.responseToken,
    responseUrl: ruleInput.responseUrl,
    resultComment,
    resultStatus,
    ...(resultContent !== undefined && { resultContent }),
  });
}
