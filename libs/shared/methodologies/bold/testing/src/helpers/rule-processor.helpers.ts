import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import { AnyObject, MethodologyParticipant } from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { BoldStubsBuilder, type StubBoldDocumentParameters } from '../builders';

interface CreateBoldStubsParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIDDocumentsParams?: StubBoldDocumentParameters | undefined;
}

interface ProcessRuleTestParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIDDocumentsParams?: StubBoldDocumentParameters | undefined;
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

export function createBoldStubsForMassIDProcessor({
  accreditationDocuments,
  massIDActorParticipants,
  massIDDocumentsParams,
}: CreateBoldStubsParameters) {
  return new BoldStubsBuilder({
    ...(massIDActorParticipants && { massIDActorParticipants }),
  })
    .createMassIDDocuments(massIDDocumentsParams)
    .createMassIDAuditDocuments()
    .createMethodologyDocument()
    .createParticipantAccreditationDocuments(accreditationDocuments)
    .build();
}

export async function createRuleTestFixture({
  accreditationDocuments,
  massIDActorParticipants,
  massIDDocumentsParams,
  ruleDataProcessor,
  spyOnDocumentQueryServiceLoad,
}: ProcessRuleTestParameters): Promise<{
  ruleInput: RuleInput;
  ruleOutput: RuleOutput;
}> {
  const {
    massIDAuditDocument,
    massIDDocument,
    participantsAccreditationDocuments,
  } = createBoldStubsForMassIDProcessor({
    accreditationDocuments,
    massIDActorParticipants,
    massIDDocumentsParams,
  });

  const allDocuments = [
    massIDDocument,
    massIDAuditDocument,
    ...participantsAccreditationDocuments.values(),
  ];

  spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

  const ruleInput = {
    ...random<Required<RuleInput>>(),
    documentId: massIDAuditDocument.id,
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
