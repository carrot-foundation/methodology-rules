import {
  stubCreditCertificatesDocument,
  stubCreditDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
  stubMassCertificateDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { pick, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubArray,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';

import type { Actor, RewardsDistribution } from './rewards-distribution.types';

import { handler } from '../lambda';
import {
  stubCertificateRewardsDistributionResultContent,
  stubMassCertificateAuditDocumentWithResultContent,
  stubMassDocumentWithEndEventValue,
} from './rewards-distribution.stubs';

const { RULES_METADATA } = DocumentEventName;
const { UNIT_PRICE } = DocumentEventAttributeName;

describe('RewardsDistributionProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const creditId = faker.string.uuid();
  const unitPrice = faker.number.float({ fractionDigits: 2, max: 50, min: 10 });
  const massTotalValue = new BigNumber(
    faker.number.float({
      max: 2000,
      min: 100,
    }),
  ).decimalPlaces(2, BigNumber.ROUND_DOWN);

  const masses = stubArray(
    () =>
      stubMassDocumentWithEndEventValue(
        Number(massTotalValue.dividedBy(2).toString()),
      ),
    2,
  );

  const massAudits = masses.map((value) =>
    stubMassAuditDocument({
      parentDocumentId: value.id,
    }),
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

  const actors: Actor[] = [];

  let participantsAmount = new BigNumber(0);

  for (const certificateReward of rewards.certificateRewards) {
    const amount = new BigNumber(certificateReward.percentage)
      .dividedBy(100)
      .multipliedBy(massTotalValue)
      .multipliedBy(unitPrice)
      .decimalPlaces(6, BigNumber.ROUND_DOWN);

    participantsAmount = participantsAmount.plus(amount);
  }

  const remainderAmount = new BigNumber(massTotalValue)
    .multipliedBy(unitPrice)
    .minus(participantsAmount)
    .decimalPlaces(6, BigNumber.ROUND_DOWN)
    .toString();

  let networkInitialPercentage = '';

  let expectedPercentageTotal = new BigNumber(0);

  for (const certificateReward of rewards.certificateRewards) {
    const amount = new BigNumber(certificateReward.percentage)
      .dividedBy(100)
      .multipliedBy(massTotalValue)
      .multipliedBy(unitPrice)
      .decimalPlaces(6, BigNumber.ROUND_DOWN);

    const percentage = amount
      .dividedBy(participantsAmount)
      .multipliedBy(100)
      .decimalPlaces(6, BigNumber.ROUND_DOWN)
      .toString();

    expectedPercentageTotal = expectedPercentageTotal.plus(percentage);

    if (certificateReward.actorType === DocumentEventActorType.NETWORK) {
      networkInitialPercentage = percentage;
      actors.push({
        actorType: certificateReward.actorType,
        amount: amount.plus(remainderAmount).toString(),
        participant: certificateReward.participant,
        percentage,
      });
    } else {
      actors.push({
        actorType: certificateReward.actorType,
        amount: amount.toString(),
        participant: certificateReward.participant,
        percentage,
      });
    }
  }

  const remainderPercentage = new BigNumber(100).minus(expectedPercentageTotal);

  it('should return APPROVED and correct rewards distribution', async () => {
    const response = (await handler(
      stubRuleInput({
        documentId: credit.id,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as { resultContent: RewardsDistribution };

    const { resultContent } = response;

    let amountTotal = new BigNumber(0);
    let percentageTotal = new BigNumber(0);

    for (const actor of resultContent.actors) {
      amountTotal = amountTotal.plus(actor.amount);
      percentageTotal = percentageTotal.plus(actor.percentage);

      if (actor.actorType === DocumentEventActorType.NETWORK) {
        const expectedActorIndex = actors.findIndex(
          (expectedActor) =>
            expectedActor.participant.id === actor.participant.id,
        );

        actors[expectedActorIndex]!.percentage = new BigNumber(
          networkInitialPercentage,
        )
          .plus(remainderPercentage)
          .toString();
      }
    }

    expect(response).toMatchObject({
      resultContent: {
        actors,
        massTotalValue: massTotalValue.toString(),
        remainder: {
          amount: remainderAmount,
          percentage: remainderPercentage.toString(),
        },
        unitPrice,
      },
      resultStatus: RuleOutputStatus.APPROVED,
    });

    expect(
      new BigNumber(resultContent.massTotalValue)
        .multipliedBy(resultContent.unitPrice)
        .toString(),
    ).toBe(amountTotal.toString());

    expect(percentageTotal.toString()).toBe('100');
  });
});
