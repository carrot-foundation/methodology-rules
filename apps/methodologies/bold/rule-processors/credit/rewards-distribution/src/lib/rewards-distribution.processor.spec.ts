import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadParentDocument,
} from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubCreditDocument,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type CertificateRewardDistributionOutput,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import {
  stubMassCertificateAuditDocumentWithResultContent,
  stubMassDocumentWithEndEventValue,
} from './rewards-distribution.stubs';

const { OPEN } = DocumentEventName;
const { UNIT_PRICE } = DocumentEventAttributeName;

describe('RewardsDistributionProcessor', () => {
  const ruleDataProcessor = new RewardsDistributionProcessor();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    {
      credit: stubCreditDocument(),
      errorMessage:
        ruleDataProcessor[
          'ErrorMessage'
        ].UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT('123'),
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(
          { id: '123' },
          {} as CertificateRewardDistributionOutput,
        ),
      ],
      scenario: 'the rule result content is an unexpected value',
    },
    {
      credit: stubCreditDocument(),
      errorMessage:
        ruleDataProcessor['ErrorMessage'].MASS_CERTIFICATE_AUDITS_NOT_FOUND,
      scenario: 'mass certificate audits are not found',
    },
    {
      credit: stubCreditDocument(),
      errorMessage: 'assert',
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [
        stubMassDocumentWithEndEventValue(
          String(faker.number.int()) as unknown as number,
        ),
      ],
      scenario: 'the mass END event value is not a number',
    },
    {
      credit: undefined,
      errorMessage: ruleDataProcessor['ErrorMessage'].CREDIT_NOT_FOUND,
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [stubMassDocumentWithEndEventValue()],
      scenario: 'the credit document was not found',
    },
    {
      credit: stubCreditDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [UNIT_PRICE, faker.string.alpha()],
          ]),
        ],
      }),
      errorMessage: ruleDataProcessor['ErrorMessage'].INVALID_UNIT_PRICE,
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [stubMassDocumentWithEndEventValue()],
      scenario: 'the credit OPEN event has an invalid unit price',
    },
  ])(
    `should throw error when $scenario`,
    async ({ credit, errorMessage, massCertificateAudits, masses }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnLoadParentDocument(credit);

      if (massCertificateAudits) {
        spyOnDocumentQueryServiceLoad(stubDocument(), massCertificateAudits);
      }

      if (masses) {
        spyOnDocumentQueryServiceLoad(stubDocument(), masses);
      }

      await expect(ruleDataProcessor.process(ruleInput)).rejects.toThrow(
        errorMessage,
      );
    },
  );
});
