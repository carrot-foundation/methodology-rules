import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { CdfReasonDismissalProcessor } from './cdf-reason-dismissal.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('CdfReasonDismissalProcessor', () => {
  const ruleDataProcessor = new CdfReasonDismissalProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { HAS_CDF, HAS_REASON_DISMISSAL_CDF } = DocumentEventAttributeName;
  const { END } = DocumentEventName;

  describe('process', () => {
    it.each([
      {
        attributes: [{ isPublic: true, name: HAS_CDF, value: true }],
        resultComment:
          ruleDataProcessor['getMissingRuleSubjectResultComment'](),
        resultStatus: RuleOutputStatus.APPROVED,
        scenario:
          'should return APPROVED if the document has the has-cdf equal true in an END event',
      },
      {
        attributes: [
          { isPublic: true, name: HAS_CDF, value: false },
          {
            isPublic: true,
            name: HAS_REASON_DISMISSAL_CDF,
            value: faker.string.sample(),
          },
        ],
        resultComment: ruleDataProcessor['ResultComment'].APPROVED,
        resultStatus: RuleOutputStatus.APPROVED,
        scenario:
          'should return the returnValue equal APPROVED if the document has the has-cdf equal false but have the has-reason-dismissal-cdf attribute',
      },
      {
        attributes: [{ isPublic: true, name: HAS_CDF, value: false }],
        resultComment: ruleDataProcessor['ResultComment'].REJECTED,
        resultStatus: RuleOutputStatus.REJECTED,
        scenario:
          'should return the returnValue equal REJECTED if the END event has the has-cdf attribute equal false and does not have the has-reason-dismissal-cdf attribute',
      },
      {
        attributes: [
          { isPublic: true, name: HAS_CDF, value: false },
          { isPublic: true, name: HAS_REASON_DISMISSAL_CDF, value: '' },
        ],
        resultComment: ruleDataProcessor['ResultComment'].REJECTED,
        resultStatus: RuleOutputStatus.REJECTED,
        scenario:
          'should return the returnValue equal REJECTED if the END event has the has-cdf attribute equal false and the the has-reason-dismissal-cdf is an empty string',
      },
    ])('$scenario', async ({ attributes, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({
        externalEvents: [
          ...stubArray(() => random<DocumentEvent>()),
          {
            ...stubDocumentEvent({
              name: END,
            }),
            metadata: {
              attributes,
            },
          },
        ],
      });

      documentLoaderService.mockResolvedValueOnce(document);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };
      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      expect(ruleOutput).toEqual(expectedRuleOutput);
    });
  });
});
