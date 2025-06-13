import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { PreventedEmissionsProcessor } from './prevented-emissions.processor';
import {
  preventedEmissionsErrorTestCases,
  preventedEmissionsTestCases,
} from './prevented-emissions.test-cases';

describe('PreventedEmissionsProcessor', () => {
  const ruleDataProcessor = new PreventedEmissionsProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('PreventedEmissionsProcessor', () => {
    it.each(preventedEmissionsTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        homologationDocuments,
        massIdDocumentValue,
        resultComment,
        resultContent,
        resultStatus,
        subtype,
      }) => {
        const {
          massIdAuditDocument,
          massIdDocument,
          participantsHomologationDocuments,
        } = new BoldStubsBuilder()
          .createMassIdDocuments({
            partialDocument: {
              currentValue: massIdDocumentValue as number,
              subtype,
            },
          })
          .createMassIdAuditDocuments()
          .createMethodologyDocument()
          .createParticipantHomologationDocuments(homologationDocuments)
          .build();

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

        const ruleOutput = await ruleDataProcessor.process(ruleInput);

        expect(ruleOutput).toEqual({
          requestId: ruleInput.requestId,
          responseToken: ruleInput.responseToken,
          responseUrl: ruleInput.responseUrl,
          resultComment,
          resultContent,
          resultStatus,
        });
      },
    );
  });

  describe('PreventedEmissionsProcessorErrors', () => {
    it.each(preventedEmissionsErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIdAuditDocument,
        resultComment,
        resultStatus,
      }) => {
        const allDocuments = [massIdAuditDocument, ...documents];

        spyOnDocumentQueryServiceLoad(massIdAuditDocument, allDocuments);

        const ruleInput = {
          ...random<Required<RuleInput>>(),
          documentId: massIdAuditDocument.id,
        };

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
