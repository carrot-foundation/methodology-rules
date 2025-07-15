import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  createRuleTestFixture,
  expectRuleOutput,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { GeolocationAndAddressPrecisionProcessor } from './geolocation-and-address-precision.processor';
import {
  geolocationAndAddressPrecisionErrorTestCases,
  geolocationAndAddressPrecisionTestCases,
} from './geolocation-and-address-precision.test-cases';

describe('GeolocationAndAddressPrecisionProcessor', () => {
  const ruleDataProcessor = new GeolocationAndAddressPrecisionProcessor();

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it.each(geolocationAndAddressPrecisionTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationDocuments,
      actorParticipants,
      massIdDocumentParameters,
      resultComment,
      resultStatus,
    }) => {
      const { ruleInput, ruleOutput } = await createRuleTestFixture({
        accreditationDocuments,
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

  describe('GeolocationAndAddressPrecisionProcessorErrors', () => {
    it.each(geolocationAndAddressPrecisionErrorTestCases)(
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
