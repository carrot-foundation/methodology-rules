import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
  BoldDocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { rewardsDistributionLambda } from './rewards-distribution.lambda';
import {
  rewardsDistributionProcessorErrors,
  rewardsDistributionProcessorTestCases,
} from './rewards-distribution.test-cases';

const { ONBOARDING_DECLARATION } = BoldDocumentEventName;
const { BUSINESS_SIZE_DECLARATION } = BoldAttributeName;
const { WASTE_GENERATOR } = BoldDocumentSubtype;

interface MassIDRewardsResultContent {
  massIDRewards: Array<{
    actorType: string;
    massIDPercentage: string;
  }>;
}

describe('RewardsDistributionProcessor E2E', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(rewardsDistributionProcessorTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      accreditationBusinessSize,
      expectedRewards,
      massIDDocumentEvents,
      massIDPartialDocument,
      resultStatus,
    }) => {
      const builder = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: massIDDocumentEvents,
          partialDocument: massIDPartialDocument,
        })
        .createMassIDAuditDocuments()
        .createMethodologyDocument()
        .createMassIDCertificateDocuments();

      if (accreditationBusinessSize !== undefined) {
        builder.createParticipantAccreditationDocuments(
          new Map([
            [
              WASTE_GENERATOR,
              {
                externalEventsMap: {
                  [ONBOARDING_DECLARATION]:
                    stubDocumentEventWithMetadataAttributes(
                      { name: ONBOARDING_DECLARATION },
                      [[BUSINESS_SIZE_DECLARATION, accreditationBusinessSize]],
                    ),
                },
              },
            ],
          ]),
        );
      }

      const {
        massIDAuditDocument,
        massIDCertificateDocument,
        massIDDocument,
        methodologyDocument,
        participantsAccreditationDocuments,
      } = builder.build();

      const documents: BoldDocument[] = [
        massIDDocument,
        massIDAuditDocument,
        massIDCertificateDocument,
        methodologyDocument as BoldDocument,
        ...participantsAccreditationDocuments.values(),
      ];

      prepareEnvironmentTestE2E(
        documents.map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await rewardsDistributionLambda(
        stubRuleInput({
          documentId: massIDCertificateDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      const rewardsByActor = Object.fromEntries(
        (
          response.resultContent as MassIDRewardsResultContent
        ).massIDRewards.map(({ actorType, massIDPercentage }) => [
          actorType,
          massIDPercentage,
        ]),
      );

      expect(response.resultStatus).toBe(resultStatus);
      expect(rewardsByActor).toEqual(expectedRewards);
    },
  );

  describe('RewardsDistributionProcessorErrors', () => {
    it.each(rewardsDistributionProcessorErrors)(
      'should return $resultStatus when $scenario',
      async ({
        documents,
        massIDAuditDocument,
        massIDCertificateDocument,
        resultStatus,
      }) => {
        prepareEnvironmentTestE2E(
          [...documents, massIDAuditDocument, massIDCertificateDocument].map(
            (document) => ({
              document,
              documentKey: toDocumentKey({
                documentId: document.id,
                documentKeyPrefix,
              }),
            }),
          ),
        );

        const response = (await rewardsDistributionLambda(
          stubRuleInput({
            documentId: massIDCertificateDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });
});
