import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import {
  BoldStubsBuilder,
  type StubBoldDocumentParameters,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleInput, RuleOutput } from '@carrot-fndn/shared/rule/types';
import { AnyObject, MethodologyParticipant } from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { DocumentQueryService } from './document-query.service';
import * as documentHelpers from './document.helpers';

export const spyOnDocumentQueryServiceLoad = (
  rootDocument: Document,
  documents: Document[],
) => {
  jest.spyOn(DocumentQueryService.prototype, 'load').mockResolvedValueOnce({
    iterator: () => ({
      each: (callback) =>
        Promise.resolve(
          // eslint-disable-next-line github/array-foreach, unicorn/no-array-for-each
          documents.forEach((document) => callback({ document })),
        ),
      map: (callback) =>
        Promise.resolve(documents.map((document) => callback({ document }))),
    }),
    rootDocument,
  });
};

export const spyOnLoadDocument = (
  result: Awaited<ReturnType<(typeof documentHelpers)['loadDocument']>>,
) => {
  jest.spyOn(documentHelpers, 'loadDocument').mockResolvedValueOnce(result);
};

interface CreateBoldStubsParams {
  homologationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIdDocumentsParams?: StubBoldDocumentParameters | undefined;
}

interface ProcessRuleTestParams {
  homologationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIdActorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIdDocumentsParams?: StubBoldDocumentParameters | undefined;
  ruleDataProcessor: RuleDataProcessor;
}

interface TestExpectedRuleOutputParameters {
  resultComment: string;
  resultContent?: AnyObject | undefined;
  resultStatus: string;
  ruleInput: RuleInput;
  ruleOutput: RuleOutput;
}

export function createBoldStubsForMassIdProcessor({
  homologationDocuments,
  massIdActorParticipants,
  massIdDocumentsParams,
}: CreateBoldStubsParams) {
  return new BoldStubsBuilder({
    ...(massIdActorParticipants && { massIdActorParticipants }),
  })
    .createMassIdDocuments(massIdDocumentsParams)
    .createMassIdAuditDocuments()
    .createMethodologyDocument()
    .createParticipantHomologationDocuments(homologationDocuments)
    .build();
}

export async function createRuleTestFixture({
  homologationDocuments,
  massIdActorParticipants,
  massIdDocumentsParams,
  ruleDataProcessor,
}: ProcessRuleTestParams): Promise<{
  ruleInput: RuleInput;
  ruleOutput: RuleOutput;
}> {
  const {
    massIdAuditDocument,
    massIdDocument,
    participantsHomologationDocuments,
  } = createBoldStubsForMassIdProcessor({
    homologationDocuments,
    massIdActorParticipants,
    massIdDocumentsParams,
  });

  const allDocuments = [
    massIdDocument,
    massIdAuditDocument,
    ...participantsHomologationDocuments.values(),
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
