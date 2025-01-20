import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadParentDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubCreditDocument,
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  stubMassCertificateAuditDocument,
  stubMassDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type CertificateRewardDistributionOutput,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
import { random } from 'typia';

import { RewardsDistributionProcessor } from './rewards-distribution.processor';
import {
  stubMassCertificateAuditDocumentWithResultContent,
  stubMassDocumentWithEndEventValue,
} from './rewards-distribution.stubs';

const { END, RULES_METADATA } = MethodologyDocumentEventName;
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
        ruleDataProcessor['ErrorMessage'].REWARDS_DISTRIBUTION_NOT_FOUND(
          'documentId',
        ),
      massCertificateAudits: [
        stubMassCertificateAuditDocument({ id: 'documentId' }),
      ],
      scenario: 'the rewards distribution was not found',
    },
    {
      credit: stubCreditDocument(),
      errorMessage:
        ruleDataProcessor['ErrorMessage'].MASS_CERTIFICATE_AUDITS_NOT_FOUND,
      scenario: 'mass certificate audits are not found',
    },
    {
      credit: stubCreditDocument(),
      errorMessage: ruleDataProcessor['ErrorMessage'].INVALID_END_EVENT_VALUE(
        'documentId',
        'invalid',
      ),
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [
        stubMassDocument({
          externalEvents: [
            stubDocumentEventWithMetadataAttributes({
              name: END,
              value: 'invalid' as never,
            }),
          ],
          id: 'documentId',
        }),
      ],
      scenario: 'the mass END event value is not a number',
    },
    {
      credit: stubCreditDocument(),
      errorMessage:
        ruleDataProcessor['ErrorMessage'].END_EVENT_NOT_FOUND('documentId'),
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [stubMassDocument({ id: 'documentId' })],
      scenario: 'the mass END event was not found',
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
      credit: stubCreditDocument({ id: 'documentId' }),
      errorMessage:
        ruleDataProcessor['ErrorMessage'].RULES_METADATA_NOT_FOUND(
          'documentId',
        ),
      massCertificateAudits: [
        stubMassCertificateAuditDocumentWithResultContent(),
      ],
      masses: [stubMassDocumentWithEndEventValue()],
      scenario: 'the rules metadata event was not found',
    },
    {
      credit: stubCreditDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
            [UNIT_PRICE, 'invalid'],
          ]),
        ],
        id: 'documentId',
      }),
      errorMessage: ruleDataProcessor['ErrorMessage'].INVALID_UNIT_PRICE(
        'documentId',
        'invalid',
      ),
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
