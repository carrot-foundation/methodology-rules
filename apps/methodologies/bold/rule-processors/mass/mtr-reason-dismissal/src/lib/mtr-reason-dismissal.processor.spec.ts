import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { MTR_REASON_DISMISSAL_RESULT_COMMENT } from './mtr-reason-dismissal.constants';
import { MtrReasonDismissalProcessor } from './mtr-reason-dismissal.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('MtrReasonDismissalProcessor', () => {
  const ruleDataProcessor = new MtrReasonDismissalProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_MTR,
          value: true,
        },
      ],
      resultComment: MTR_REASON_DISMISSAL_RESULT_COMMENT.has_mtr,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED if the document has the has-mtr equal true in an OPEN event',
    },
    {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_MTR,
          value: false,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_REASON_DISMISSAL_MTR,
          value: faker.string.sample(),
        },
      ],
      resultComment: MTR_REASON_DISMISSAL_RESULT_COMMENT.approved,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the returnValue equal APPROVED if the document has the has-mtr equal false but have the has-reason-dismissal-mtr attribute',
    },
    {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_MTR,
          value: false,
        },
      ],
      resultComment: MTR_REASON_DISMISSAL_RESULT_COMMENT.rejected,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the returnValue equal REJECTED if the OPEN event has the has-mtr attribute equal false and does not have the has-reason-dismissal-mtr',
    },
    {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_MTR,
          value: false,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.HAS_REASON_DISMISSAL_MTR,
          value: '',
        },
      ],
      resultComment: MTR_REASON_DISMISSAL_RESULT_COMMENT.rejected,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the returnValue equal REJECTED if the OPEN event has the has-mtr attribute equal false and the the has-reason-dismissal-mtr is an empty string',
    },
  ])('$scenario', async ({ attributes, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [
        ...stubArray(() => random<DocumentEvent>()),
        {
          ...stubDocumentEvent({
            name: MethodologyDocumentEventName.OPEN,
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

  it('should return the resultStatus REJECTED if there is no document', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(undefined);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
