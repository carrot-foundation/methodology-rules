import {
  DocumentQueryService,
  LEGACY_PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  spyOnDocumentQueryServiceLoad,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { MassIDSortingProcessor } from './mass-id-sorting.processor';
import {
  massIDSortingErrorTestCases,
  massIDSortingTestCases,
} from './mass-id-sorting.test-cases';

describe('MassIDSortingProcessor', () => {
  const ruleDataProcessor = new MassIDSortingProcessor();

  it.each(
    massIDSortingTestCases.filter(
      (testCase) => testCase.resultStatus === 'PASSED',
    ),
  )(
    'should refuse a wrong-facility accreditation when $scenario',
    async (testCase) => {
      const { ruleOutput } = await createRuleTestFixture({
        accreditationDocuments: testCase.accreditationDocuments,
        configureDocuments: (documents) => {
          for (const document of documents.participantsAccreditationDocuments.values()) {
            document.primaryAddress = {
              ...document.primaryAddress,
              id: 'unrelated-facility',
            };
          }
        },
        massIDActorParticipants: testCase.actorParticipants,
        massIDDocumentsParams: {
          externalEventsMap: testCase.massIDEvents,
          partialDocument: testCase.partialDocument,
        },
        ruleDataProcessor,
        spyOnDocumentQueryServiceLoad,
      });

      expect(ruleOutput.resultStatus).toBe('FAILED');
    },
  );
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
          resultComment,
          resultStatus,
          ruleInput,
          ruleOutput,
        });

        expect(DocumentQueryService.prototype.load).toHaveBeenCalledWith(
          expect.objectContaining({
            criteria: LEGACY_PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
          }),
        );
      },
    );
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

        expect(ruleOutput).toEqual({
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
