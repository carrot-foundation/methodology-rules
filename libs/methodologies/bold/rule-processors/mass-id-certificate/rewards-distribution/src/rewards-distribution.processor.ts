import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { isActorEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  MassIDOrganicSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import BigNumber from 'bignumber.js';
import { is } from 'typia';

import {
  LARGE_REVENUE_BUSINESS_DISCOUNT,
  REQUIRED_ACTOR_TYPES,
  REWARDS_DISTRIBUTION,
  REWARDS_DISTRIBUTION_BY_WASTE_TYPE,
  REWARDS_DISTRIBUTION_CRITERIA,
} from './rewards-distribution.constants';
import { RewardsDistributionProcessorErrors } from './rewards-distribution.errors';
import {
  calculatePercentageForUnidentifiedWasteOrigin,
  checkIfHasRequiredActorTypes,
  getActorsByType,
  getNgoActorMassIDPercentage,
  getWasteGeneratorAdditionalPercentage,
  isWasteOriginIdentified,
  mapActorReward,
  mapMassIDRewards,
} from './rewards-distribution.helpers';
import {
  type ActorMassIDPercentageInputDto,
  type ActorReward,
  type RewardsDistributionActor,
  type RewardsDistributionActorTypePercentage,
} from './rewards-distribution.types';

BigNumber.config({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_DOWN });

export class RewardsDistributionProcessor extends RuleDataProcessor {
  readonly errorProcessor = new RewardsDistributionProcessorErrors();

  async getRuleDocuments(documentQuery: DocumentQuery<Document>): Promise<{
    massIDDocument: Document | undefined;
    methodologyDocument: Document | undefined;
  }> {
    let massIDDocument: Document | undefined;
    let methodologyDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
      }

      if (METHODOLOGY_DEFINITION.matches(documentRelation)) {
        methodologyDocument = document;
      }
    });

    return {
      massIDDocument,
      methodologyDocument,
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentLoader = await new DocumentQueryService(
        provideDocumentLoaderService,
      ).load({
        context: {
          s3KeyPrefix: ruleInput.documentKeyPrefix,
        },
        criteria: REWARDS_DISTRIBUTION_CRITERIA,
        documentId: String(ruleInput.documentId),
      });

      const { massIDDocument, methodologyDocument } =
        await this.getRuleDocuments(documentLoader);

      if (isNil(massIDDocument)) {
        throw this.errorProcessor.getKnownError(
          this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
        );
      }

      if (isNil(methodologyDocument)) {
        throw this.errorProcessor.getKnownError(
          this.errorProcessor.ERROR_MESSAGE.METHODOLOGY_DOCUMENT_NOT_FOUND,
        );
      }

      const actorRewards = this.getActorRewards({
        massIDDocument,
        methodologyDocument,
      });

      return mapToRuleOutput(ruleInput, RuleOutputStatus.PASSED, {
        resultContent: {
          massIDDocumentId: massIDDocument.id,
          massIDRewards: mapMassIDRewards(actorRewards),
        },
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }

  private extractMassIDSubtype(document: Document): MassIDOrganicSubtype {
    if (!is<MassIDOrganicSubtype>(document.subtype)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.UNEXPECTED_DOCUMENT_SUBTYPE(
          String(document.subtype),
        ),
      );
    }

    return document.subtype;
  }

  private getActorMassIDPercentage(
    dto: ActorMassIDPercentageInputDto,
  ): BigNumber {
    const { actors, actorType, massIDDocument, rewardDistribution } = dto;

    let actorMassIDPercentage = rewardDistribution;
    const rewardDistributions =
      this.getRewardsDistributionActorTypePercentages(massIDDocument);
    const wasteGeneratorRewardDistribution =
      rewardDistributions['Waste Generator'];

    if (actorType === RewardsDistributionActorType.WASTE_GENERATOR) {
      actorMassIDPercentage = this.getWasteGeneratorActorMassIDPercentage(
        massIDDocument,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
      );
    }

    if (actorType === RewardsDistributionActorType.COMMUNITY_IMPACT_POOL) {
      const sourcePercentage = getNgoActorMassIDPercentage(
        massIDDocument,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
        this.getWasteGeneratorActorMassIDFullPercentage.bind(this),
      );

      actorMassIDPercentage = actorMassIDPercentage.plus(sourcePercentage);
    }

    if (!isWasteOriginIdentified(massIDDocument)) {
      const additionalPercentage = getWasteGeneratorAdditionalPercentage(
        actors,
        rewardDistributions,
      );

      actorMassIDPercentage = calculatePercentageForUnidentifiedWasteOrigin({
        actors,
        actorType,
        additionalPercentage,
        basePercentage: actorMassIDPercentage,
        rewardDistributions,
        wasteGeneratorPercentage: wasteGeneratorRewardDistribution,
      });
    }

    return actorMassIDPercentage;
  }

  private getActorRewards({
    massIDDocument,
    methodologyDocument,
  }: {
    massIDDocument: Document;
    methodologyDocument: Document;
  }): ActorReward[] {
    const result: ActorReward[] = [];
    const actors = this.getRewardsDistributionActors(massIDDocument);
    const distributions =
      this.getRewardsDistributionActorTypePercentages(massIDDocument);

    for (const [actorType, rewardDistribution] of Object.entries(
      distributions,
    )) {
      if (
        is<RewardsDistributionActorType>(actorType) &&
        is<BigNumber>(rewardDistribution)
      ) {
        const actorsByType = getActorsByType({
          actors,
          actorType,
          methodologyDocument,
        });

        if (isNonEmptyArray(actorsByType)) {
          const massIDPercentage = this.getActorMassIDPercentage({
            actors,
            actorType,
            massIDDocument,
            rewardDistribution,
          }).div(actorsByType.length);

          result.push(
            ...actorsByType.map(
              ({ address, participant, preserveSensitiveData, type }) =>
                mapActorReward({
                  actorType: type,
                  address,
                  massIDDocument,
                  massIDPercentage,
                  participant,
                  preserveSensitiveData,
                }),
            ),
          );
        }
      }
    }

    return result;
  }

  private getRewardsDistributionActors(
    document: Document,
  ): RewardsDistributionActor[] {
    const actors: RewardsDistributionActor[] = [];

    if (!isNonEmptyArray(document.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.EXTERNAL_EVENTS_NOT_FOUND(
          document.id,
        ),
      );
    }

    const actorEvents = document.externalEvents.filter((event) =>
      isActorEvent(event),
    );

    for (const event of actorEvents) {
      const actorType = event.label;

      if (is<RewardsDistributionActorType>(actorType)) {
        actors.push({
          address: {
            id: event.address.id,
          },
          participant: {
            id: event.participant.id,
            name: event.participant.name,
          },
          preserveSensitiveData: event.preserveSensitiveData,
          type: actorType,
        });
      }
    }

    try {
      checkIfHasRequiredActorTypes({
        actors,
        documentId: document.id,
        requiredActorTypes: REQUIRED_ACTOR_TYPES.MASS_ID,
      });
    } catch {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_REQUIRED_ACTORS(
          document.id,
          REQUIRED_ACTOR_TYPES.MASS_ID.filter(
            (requiredActorType) =>
              !actors.some((actor) => actor.type === requiredActorType),
          ),
        ),
      );
    }

    return actors;
  }

  private getRewardsDistributionActorTypePercentages(
    document: Document,
  ): RewardsDistributionActorTypePercentage {
    const documentSubtype = this.extractMassIDSubtype(document);
    const wasteType = REWARDS_DISTRIBUTION_BY_WASTE_TYPE[documentSubtype];

    return REWARDS_DISTRIBUTION[wasteType];
  }

  private getWasteGeneratorActorMassIDFullPercentage(
    document: Document,
    actorMassIDPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    if (isWasteOriginIdentified(document)) {
      return actorMassIDPercentage.plus(
        getWasteGeneratorAdditionalPercentage(actors, rewardDistributions),
      );
    }

    return new BigNumber(0);
  }

  private getWasteGeneratorActorMassIDPercentage(
    document: Document,
    actorMassIDPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    const fullPercentage = this.getWasteGeneratorActorMassIDFullPercentage(
      document,
      actorMassIDPercentage,
      actors,
      rewardDistributions,
    );

    // TODO: Today all waste generators are eligible for the discount, but we need to apply it only to large source companies based on the accreditation document
    return fullPercentage.multipliedBy(1 - LARGE_REVENUE_BUSINESS_DISCOUNT);
  }
}
