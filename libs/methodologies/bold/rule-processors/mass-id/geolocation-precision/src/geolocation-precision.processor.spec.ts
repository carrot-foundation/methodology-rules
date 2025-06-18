import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { GeolocationPrecisionProcessor } from './geolocation-precision.processor';
import {
  geolocationPrecisionErrorTestCases,
  geolocationPrecisionTestCases,
} from './geolocation-precision.test-cases';

describe('GeolocationPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationPrecisionProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it.each(geolocationPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      actorParticipants,
      homologationDocuments,
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const { ruleInput, ruleOutput } = await createRuleTestFixture({
        homologationDocuments,
        massIdActorParticipants: actorParticipants,
        massIdDocumentsParams: massIdDocumentParameters,
        ruleDataProcessor,
        spyOnDocumentQueryServiceLoad,
      });

      expectRuleOutput({
        resultComment,
        resultStatus,
        ruleInput,
        ruleOutput,
      });
    },
  );

  describe('GeolocationPrecisionProcessorErrors', () => {
    it.each(geolocationPrecisionErrorTestCases)(
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
