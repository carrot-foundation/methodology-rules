import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubAddress,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CdfAddressProcessor } from './cdf-address.processor';

jest.mock('@carrot-fndn/methodologies/bold/recycling/organic/io-helpers');

describe('CdfAddressProcessor', () => {
  const ruleDataProcessor = new CdfAddressProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);
  const address = stubAddress();

  const { ACTOR_TYPE, REPORT_TYPE } = DocumentEventAttributeName;
  const { CDF } = ReportType;
  const { ACTOR, MOVE } = DocumentEventName;
  const { RECYCLER } = DocumentEventActorType;

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
            [REPORT_TYPE, ''],
          ]),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].RULE_NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the returnValue equal APPROVED if the ReportType attribute is an empty string',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: ACTOR }),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].RULE_NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the returnValue equal APPROVED if the ReportType not exists and the rule is not applicable',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ address, name: ACTOR }, [
            [ACTOR_TYPE, RECYCLER],
          ]),
          stubDocumentEventWithMetadataAttributes({ address, name: MOVE }, [
            [REPORT_TYPE, CDF],
          ]),
        ],
      }),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return the returnValue equal APPROVED if the Recycler address and the Report Type event address are equal',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
            [ACTOR_TYPE, RECYCLER],
          ]),
          stubDocumentEventWithMetadataAttributes({ name: MOVE }, [
            [REPORT_TYPE, CDF],
          ]),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].ADDRESS_DOES_NOT_MATCH,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return the returnValue equal REJECTED if the Recycler address and the Report Type event address are different',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
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
  });
});
