import {
  DocumentQueryService,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  spyOnDocumentQueryServiceLoad,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleFindings,
  expectRuleOutput,
  findTestCase,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { MASS_ID_SORTING_FINDINGS } from './mass-id-sorting.findings';
import { MassIDSortingProcessor } from './mass-id-sorting.processor';
import {
  massIDSortingErrorTestCases,
  massIDSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIDSortingProcessor', () => {
  const ruleDataProcessor = new MassIDSortingProcessor();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('MassIDSortingProcessor', () => {
    it.each(massIDSortingTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        accreditationDocuments,
        actorParticipants,
        massIDEvents,
        partialDocument,
        resultComment,
        resultStatus,
      }) => {
        const { ruleInput, ruleOutput } = await createRuleTestFixture({
          accreditationDocuments,
          massIDActorParticipants: actorParticipants,
          massIDDocumentsParams: {
            externalEventsMap: massIDEvents,
            partialDocument,
          },
          ruleDataProcessor,
          spyOnDocumentQueryServiceLoad,
        });

        expectRuleOutput({
          findings: MASS_ID_SORTING_FINDINGS,
          resultComment,
          resultStatus,
          ruleInput,
          ruleOutput,
        });

        expect(DocumentQueryService.prototype.load).toHaveBeenCalledWith(
          expect.objectContaining({
            criteria: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
          }),
        );
      },
    );

    it('should mark the deducted weight mismatch as dependent on the Recycler accreditation', async () => {
      const deductedWeightMismatchCase = findTestCase(
        massIDSortingTestCases,
        'The deducted weight does not match the expected value based on sorting factor',
      );

      const { ruleOutput } = await createRuleTestFixture({
        accreditationDocuments:
          deductedWeightMismatchCase.accreditationDocuments,
        massIDActorParticipants: deductedWeightMismatchCase.actorParticipants,
        massIDDocumentsParams: {
          externalEventsMap: deductedWeightMismatchCase.massIDEvents,
          partialDocument: deductedWeightMismatchCase.partialDocument,
        },
        ruleDataProcessor,
        spyOnDocumentQueryServiceLoad,
      });

      expect(ruleOutput.resultContent).toEqual({
        findings: [
          {
            code: 'mass-id-sorting.FAILED.DEDUCTED_WEIGHT_MISMATCH',
            defaultOwner: 'INTEGRATOR',
            dependsOnAccreditation: 'Recycler',
          },
        ],
      });
    });
  });

  describe('MassIDSortingProcessorErrors', () => {
    it.each(massIDSortingErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIDAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIDAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIDAuditDocument, allDocuments);

        const ruleInput = stubRuleInput({
          documentId: massIDAuditDocument.id,
        });

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(
          expectRuleFindings(ruleOutput, MASS_ID_SORTING_FINDINGS),
        ).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultStatus,
        });
      },
    );
  });
});
