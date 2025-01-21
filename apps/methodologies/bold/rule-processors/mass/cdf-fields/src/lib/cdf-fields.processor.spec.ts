import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { CdfFieldsProcessor } from './cdf-fields.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('CdfFieldsProcessor', () => {
  const ruleDataProcessor = new CdfFieldsProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { CDF, MTR } = ReportType;
  const { HAS_CDF, REPORT_DATE_ISSUED, REPORT_NUMBER, REPORT_TYPE } =
    DocumentEventAttributeName;

  it.each([
    {
      event: stubDocumentEventWithMetadataAttributes(
        { name: DocumentEventName.END },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, true],
          [REPORT_NUMBER, faker.number.int()],
          [REPORT_DATE_ISSUED, true],
        ],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-cdf is true, has report-number and report-date-issued',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        { name: DocumentEventName.END },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, false],
        ],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if has-cdf is equal false',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        { name: DocumentEventName.END },
        [
          [REPORT_TYPE, CDF],
          [HAS_CDF, true],
        ],
      ),
      resultComment: ruleDataProcessor['ResulComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the resultStatus REJECTED if has-cdf is equal true, but report-number or report-date-issued are undefined',
    },
    {
      event: stubDocumentEventWithMetadataAttributes(
        { name: DocumentEventName.END },
        [
          [REPORT_TYPE, MTR],
          [HAS_CDF, true],
        ],
      ),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the resultStatus APPROVED if the report-type is not CDF',
    },
  ])('$scenario', async ({ event, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();
    const document = stubDocument({
      externalEvents: [...stubArray(() => random<DocumentEvent>(), 3), event],
    });

    documentLoaderService.mockResolvedValueOnce(document);
    const ruleOutput = await ruleDataProcessor.process(ruleInput);
    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
