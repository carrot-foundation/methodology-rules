import { pick, toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  stubCreditCertificatesDocument,
  stubCreditDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
  stubMassCertificateDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubBigNumber,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { handler } from '../lambda';
import {
  stubCertificateRewardsDistributionResultContent,
  stubMassCertificateAuditDocumentWithResultContent,
  stubMassDocumentWithEndEventValue,
  stubUnitPrice,
} from './rewards-distribution.stubs';
import { assertExpectedRewardsDistribution } from './rewards-distribution.test.helpers';

const { RULES_METADATA } = DocumentEventName;
const { UNIT_PRICE } = DocumentEventAttributeName;

describe('RewardsDistributionProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const creditId = faker.string.uuid();
  const unitPrice = stubUnitPrice();
  const massValues = [stubBigNumber(), stubBigNumber()];

  const masses = massValues.map((value) =>
    stubMassDocumentWithEndEventValue(value.toNumber()),
  );

  const massAudits = masses.map(({ id: parentDocumentId }) =>
    stubMassAuditDocument({ parentDocumentId }),
  );

  const massCertificate = stubMassCertificateDocument({
    externalEvents: massAudits.map((value) =>
      stubDocumentEvent({
        relatedDocument: {
          ...pick(value, 'category', 'type', 'subtype'),
          documentId: value.id,
        },
      }),
    ),
  });

  const rewards = stubCertificateRewardsDistributionResultContent();

  const massCertificateAudit =
    stubMassCertificateAuditDocumentWithResultContent(
      { parentDocumentId: massCertificate.id },
      rewards,
    );
  const creditCertificate = stubCreditCertificatesDocument({
    externalEvents: [
      stubDocumentEvent({
        relatedDocument: {
          ...pick(massCertificateAudit, 'category', 'type', 'subtype'),
          documentId: massCertificateAudit.id,
        },
      }),
    ],
    parentDocumentId: creditId,
  });

  const credit = stubCreditDocument({
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
        [UNIT_PRICE, unitPrice],
      ]),
      stubDocumentEvent({
        relatedDocument: {
          ...pick(creditCertificate, 'category', 'type', 'subtype'),
          documentId: creditCertificate.id,
        },
      }),
    ],
    id: creditId,
  });

  beforeAll(() => {
    prepareEnvironmentTestE2E([
      {
        document: credit,
        documentKey: toDocumentKey({
          documentId: credit.id,
          documentKeyPrefix,
        }),
      },
      {
        document: massCertificate,
        documentKey: toDocumentKey({
          documentId: massCertificate.id,
          documentKeyPrefix,
        }),
      },
      {
        document: creditCertificate,
        documentKey: toDocumentKey({
          documentId: creditCertificate.id,
          documentKeyPrefix,
        }),
      },
      {
        document: massCertificateAudit,
        documentKey: toDocumentKey({
          documentId: massCertificateAudit.id,
          documentKeyPrefix,
        }),
      },
      ...masses.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
      ...massAudits.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    ]);
  });

  it('should return APPROVED and correct rewards distribution', async () => {
    const { resultContent, resultStatus } = (await handler(
      stubRuleInput({
        documentId: credit.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as never;

    expect(resultStatus).toBe(RuleOutputStatus.APPROVED);
    assertExpectedRewardsDistribution(unitPrice, resultContent);
  });
});
