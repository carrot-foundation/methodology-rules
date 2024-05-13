import {
  spyOnDocumentQueryServiceLoad,
  spyOnLoadParentDocument,
} from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocumentEventWithMetadataAttributes,
  stubOfferDocument,
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
  stubCertificateAuditDocumentWithResultContent,
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
      certificateAudits: [
        stubCertificateAuditDocumentWithResultContent(
          { id: '123' },
          {} as CertificateRewardDistributionOutput,
        ),
      ],
      errorMessage:
        ruleDataProcessor[
          'ErrorMessage'
        ].UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT('123'),
      offer: stubOfferDocument(),
      scenario: 'the rule result content is an unexpected value',
    },
    {
      errorMessage:
        ruleDataProcessor['ErrorMessage'].CERTIFICATE_AUDITS_NOT_FOUND,
      offer: stubOfferDocument(),
      scenario: 'certificate audits are not found',
    },
    {
      certificateAudits: [stubCertificateAuditDocumentWithResultContent()],
      errorMessage: 'assert',
      masses: [
        stubMassDocumentWithEndEventValue(
          String(faker.number.int()) as unknown as number,
        ),
      ],
      offer: stubOfferDocument(),
      scenario: 'the mass END event value is not a number',
    },
    {
      certificateAudits: [stubCertificateAuditDocumentWithResultContent()],
      errorMessage: ruleDataProcessor['ErrorMessage'].OFFER_NOT_FOUND,
      masses: [stubMassDocumentWithEndEventValue()],
      offer: undefined,
      scenario: 'the offer document was not found',
    },
    {
      certificateAudits: [stubCertificateAuditDocumentWithResultContent()],
      errorMessage: ruleDataProcessor['ErrorMessage'].INVALID_UNIT_PRICE,
      masses: [stubMassDocumentWithEndEventValue()],
      offer: stubOfferDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [UNIT_PRICE, faker.string.alpha()],
          ]),
        ],
      }),
      scenario: 'the offer OPEN event has an invalid unit price',
    },
  ])(
    `should throw error when $scenario`,
    async ({ certificateAudits, errorMessage, masses, offer }) => {
      const ruleInput = random<Required<RuleInput>>();

      spyOnLoadParentDocument(offer);

      if (certificateAudits) {
        spyOnDocumentQueryServiceLoad(certificateAudits);
      }

      if (masses) {
        spyOnDocumentQueryServiceLoad(masses);
      }

      await expect(ruleDataProcessor.process(ruleInput)).rejects.toThrow(
        errorMessage,
      );
    },
  );
});
