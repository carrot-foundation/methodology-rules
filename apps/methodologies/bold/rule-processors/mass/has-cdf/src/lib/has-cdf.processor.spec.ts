import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { HasCdfProcessor } from './has-cdf.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('HasCdfProcessor', () => {
  const ruleDataProcessor = new HasCdfProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
  const { CDF, MTR } = ReportType;

  const scenarios = [
    {
      hasCdf: false,
      reportType: CDF,
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-cdf is false and report-type is CDF',
    },
    {
      hasCdf: true,
      reportType: CDF,
      resultComment: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when has-cdf is true and report-type is CDF',
    },
    {
      hasCdf: true,
      reportType: MTR,
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when report-type is MTR and has-cdf is true',
    },
    {
      hasCdf: undefined,
      reportType: undefined,
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when neither has-cdf nor report-type are present',
    },
  ];

  it.each(scenarios)(
    `$scenario`,
    async ({ hasCdf, reportType, resultComment, resultStatus }) => {
      const attributes: [DocumentEventAttributeName, ReportType | boolean][] =
        [];

      if (hasCdf !== undefined) attributes.push([HAS_CDF, hasCdf]);
      if (reportType !== undefined) attributes.push([REPORT_TYPE, reportType]);

      const event = stubDocumentEventWithMetadataAttributes(
        { name: random<DocumentEventName>() },
        attributes,
      );

      const document = stubDocument({
        externalEvents: [...stubArray(() => random<DocumentEvent>(), 3), event],
      });

      const ruleInput = random<Required<RuleInput>>();

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
    },
  );
});
