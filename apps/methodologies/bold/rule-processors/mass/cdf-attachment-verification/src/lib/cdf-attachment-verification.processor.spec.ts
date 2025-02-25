import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventAttachment,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { CdfAttachmentVerificationProcessor } from './cdf-attachment-verification.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('CdfAttachmentVerificationProcessor', () => {
  const ruleDataProcessor = new CdfAttachmentVerificationProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
  const { CDF } = ReportType;

  it.each([
    {
      event: stubDocumentEventWithMetadataAttributes(
        {
          attachments: [
            stubDocumentEventAttachment({ label: faker.string.sample() }),
          ],
        },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, true],
        ],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenarion:
        'should return APPROVED when has-cdf is true, report-type is CDF, and there are attachments',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        {
          attachments: [
            stubDocumentEventAttachment({ label: faker.string.sample() }),
          ],
        },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, false],
        ],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenarion:
        'should return the resultStatus APPROVED if has-cdf is equal false',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        {
          attachments: [],
        },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, true],
        ],
      ),
      resultStatus: RuleOutputStatus.REJECTED,
      scenarion:
        'should return the resultStatus REJECTED if has-cdf is equal true, report-type is CDF but there is no attachment',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        {
          attachments: [],
        },
        [[HAS_CDF, true]],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenarion:
        'should return the resultStatus APPROVED if the report-type does not exist',
    },
  ])('$scenarion', async ({ event, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [...stubArray(() => random<DocumentEvent>(), 3), event],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus,
    };
    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
