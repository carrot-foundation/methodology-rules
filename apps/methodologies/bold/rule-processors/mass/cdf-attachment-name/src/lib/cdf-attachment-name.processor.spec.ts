import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventAttachment,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  ReportType,
  ReportTypeLiteralName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { CdfAttachmentNameProcessor } from './cdf-attachment-name.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('CdfAttachmentNameProcessor', () => {
  const ruleDataProcessor = new CdfAttachmentNameProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
  const { CDF } = ReportType;

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { attachments: [stubDocumentEventAttachment({ label: CDF })] },
            [
              [REPORT_TYPE, CDF],
              [HAS_CDF, true],
            ],
          ),
        ],
      }),
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-cdf is true, and there is attachment with label "CDF"',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              attachments: [
                stubDocumentEventAttachment({
                  label: ReportTypeLiteralName.CDF,
                }),
              ],
            },
            [
              [REPORT_TYPE, CDF],
              [HAS_CDF, true],
            ],
          ),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-cdf is true, and there is attachment with label "CERTIFICADO DE DESTINAÇÃO FINAL"',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultComment: ruleDataProcessor['ResultComments'].RULE_NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED and resultComment when not found event with "has-cdf" equal true',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
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
        ],
      }),
      resultComment: ruleDataProcessor['ResultComments'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus APPROVED if has-cdf is equal true, but there is no attachment',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              attachments: [],
            },
            [
              [REPORT_TYPE, CDF],
              [HAS_CDF, false],
            ],
          ),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComments'].RULE_NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED and resultComment, if has-cdf is equal false',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

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
