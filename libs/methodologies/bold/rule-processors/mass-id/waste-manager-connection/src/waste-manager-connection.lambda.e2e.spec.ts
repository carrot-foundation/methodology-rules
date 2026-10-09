import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { toConnectionEvidenceKey } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleOutput,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { wasteManagerConnectionLambda } from './waste-manager-connection.lambda';
import {
  stubWasteManagerConnectionMassIDDocument,
  type WasteManagerConnectionTestCase,
  wasteManagerConnectionTestCases,
} from './waste-manager-connection.test-cases';

// The lambda wrapper reports REVIEW_REQUIRED to Smaug as FAILED.
const toReportedStatus = (status: RuleOutputStatus): RuleOutputStatus =>
  status === 'REVIEW_REQUIRED' ? 'FAILED' : status;

const runLambda = async (
  {
    declaredWasteManagerIds,
    dropOffDate,
    evidence,
    extraExternalEvents,
    hasWasteGenerator,
  }: Pick<
    WasteManagerConnectionTestCase,
    | 'declaredWasteManagerIds'
    | 'dropOffDate'
    | 'evidence'
    | 'extraExternalEvents'
    | 'hasWasteGenerator'
  >,
  rawBody?: string,
) => {
  const documentKeyPrefix = faker.string.uuid();
  const ruleInput = stubRuleInput({ documentKeyPrefix });
  const generatorPalantirParticipantId =
    hasWasteGenerator === false ? null : faker.string.uuid();
  const massIDDocument = stubWasteManagerConnectionMassIDDocument({
    declaredWasteManagerIds,
    dropOffDate,
    extraExternalEvents,
    generatorPalantirParticipantId,
  });
  const evidenceBody =
    rawBody ??
    (evidence &&
      JSON.stringify(
        evidence({
          documentId: ruleInput.documentId,
          dropOffDate: dropOffDate ?? null,
          generatorPalantirParticipantId,
          massId: massIDDocument.id,
        }),
      ));

  prepareEnvironmentTestE2E([
    {
      document: massIDDocument,
      documentKey: toDocumentKey({
        documentId: massIDDocument.id,
        documentKeyPrefix,
      }),
    },
    ...(evidenceBody === undefined
      ? []
      : [
          {
            documentKey: toConnectionEvidenceKey({
              documentId: ruleInput.documentId,
              documentKeyPrefix,
            }),
            rawBody: evidenceBody,
          },
        ]),
  ]);

  return (await wasteManagerConnectionLambda(
    { ...ruleInput, parentDocumentId: massIDDocument.id },
    stubContext(),
    () => stubRuleResponse(),
  )) as RuleOutput;
};

describe('WasteManagerConnectionProcessor E2E', () => {
  it.each(wasteManagerConnectionTestCases)(
    'should validate the Waste Manager connection - $scenario',
    async ({ resultComment, resultStatus, ...scenario }) => {
      const response = await runLambda(scenario);

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(toReportedStatus(resultStatus));
    },
  );

  it('should fail when the evidence object is not JSON', async () => {
    const response = await runLambda(
      {
        declaredWasteManagerIds: [],
        dropOffDate: undefined,
        evidence: undefined,
      },
      'not-json',
    );

    expect(response.resultStatus).toBe('FAILED');
    expect(response.resultComment).toMatch(
      /^The connection evidence is malformed: /,
    );
  });
});
