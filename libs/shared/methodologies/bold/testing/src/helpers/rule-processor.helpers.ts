import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNonEmptyObject } from '@carrot-fndn/shared/helpers';
import { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import { SHARED_FINDINGS } from '@carrot-fndn/shared/rule/result';
import {
  RuleFindingSchema,
  RuleInput,
  RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { AnyObject, DocumentParticipant } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

import { BoldStubsBuilder, type StubBoldDocumentParameters } from '../builders';

interface CreateBoldStubsParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDActorParticipants?: Map<string, DocumentParticipant> | undefined;
  massIDDocumentsParams?: StubBoldDocumentParameters | undefined;
}

interface ExpectedRuleFindings {
  codes: ReadonlySet<string>;
}

interface ProcessRuleTestParameters {
  accreditationDocuments?: Map<string, StubBoldDocumentParameters> | undefined;
  massIDActorParticipants?: Map<string, DocumentParticipant> | undefined;
  massIDDocumentsParams?: StubBoldDocumentParameters | undefined;
  ruleDataProcessor: RuleDataProcessor;
  spyOnDocumentQueryServiceLoad: (
    rootDocument: BoldDocument,
    documents: BoldDocument[],
  ) => void;
}

interface TestExpectedRuleOutputParameters {
  findings?: ExpectedRuleFindings | undefined;
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

  const ruleInput: RuleInput = {
    documentId: massIDAuditDocument.id,
    documentKeyPrefix: faker.string.uuid(),
    parentDocumentId: faker.string.uuid(),
    requestId: faker.string.uuid(),
    responseToken: faker.string.uuid(),
    responseUrl: faker.internet.url(),
    ruleName: faker.string.sample(),
  };

  return { ruleInput, ruleOutput: await ruleDataProcessor.process(ruleInput) };
}

export function expectRuleFindings(
  ruleOutput: RuleOutput,
  { codes }: ExpectedRuleFindings,
): RuleOutput {
  const { resultContent = {}, ...ruleOutputWithoutContent } = ruleOutput;

  if (ruleOutput.resultStatus === 'PASSED') {
    expect(resultContent).not.toHaveProperty('findings');

    return ruleOutput;
  }

  const knownCodes = [...codes, ...SHARED_FINDINGS.codes];
  const findingsSchema = z
    .array(RuleFindingSchema.extend({ code: z.enum(knownCodes) }))
    .nonempty();

  expect(
    findingsSchema.safeParse(resultContent['findings']),
  ).toBeValidValidationResult();

  const remainingContent = Object.fromEntries(
    Object.entries(resultContent).filter(([key]) => key !== 'findings'),
  );

  return isNonEmptyObject(remainingContent)
    ? { ...ruleOutputWithoutContent, resultContent: remainingContent }
    : ruleOutputWithoutContent;
}

export function expectRuleOutput({
  findings,
  resultComment,
  resultContent,
  resultStatus,
  ruleInput,
  ruleOutput,
}: TestExpectedRuleOutputParameters): void {
  expect(
    findings === undefined
      ? ruleOutput
      : expectRuleFindings(ruleOutput, findings),
  ).toEqual({
    requestId: ruleInput.requestId,
    responseToken: ruleInput.responseToken,
    responseUrl: ruleInput.responseUrl,
    resultComment,
    resultStatus,
    ...(resultContent !== undefined && { resultContent }),
  });
}
