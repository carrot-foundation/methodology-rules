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
  MassIdOrganicSubtype,
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
  getNgoActorMassIdPercentage,
  getWasteGeneratorAdditionalPercentage,
  isWasteOriginIdentified,
  mapActorReward,
  mapMassIdRewards,
} from './rewards-distribution.helpers';
import {
  type ActorMassIdPercentageInputDto,
  type ActorReward,
  type RewardsDistributionActor,
  type RewardsDistributionActorTypePercentage,
} from './rewards-distribution.types';

BigNumber.config({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_DOWN });

export class RewardsDistributionProcessor extends RuleDataProcessor {
  readonly errorProcessor = new RewardsDistributionProcessorErrors();

  async getRuleDocuments(documentQuery: DocumentQuery<Document>): Promise<{
    massIdDocument: Document | undefined;
    methodologyDocument: Document | undefined;
  }> {
    let massIdDocument: Document | undefined;
    let methodologyDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (MASS_ID.matches(documentRelation)) {
        massIdDocument = document;
      }

      if (METHODOLOGY_DEFINITION.matches(documentRelation)) {
        methodologyDocument = document;
      }
    });

    return {
      massIdDocument,
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

      const { massIdDocument, methodologyDocument } =
        await this.getRuleDocuments(documentLoader);

      if (isNil(massIdDocument)) {
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
        massIdDocument,
        methodologyDocument,
      });

      return mapToRuleOutput(ruleInput, RuleOutputStatus.PASSED, {
        resultContent: {
          massIdDocumentId: massIdDocument.id,
          massIdRewards: mapMassIdRewards(actorRewards),
        },
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }

  private extractMassIdSubtype(document: Document): MassIdOrganicSubtype {
    if (!is<MassIdOrganicSubtype>(document.subtype)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.UNEXPECTED_DOCUMENT_SUBTYPE(
          String(document.subtype),
        ),
      );
    }

    return document.subtype;
  }

  private getActorMassIdPercentage(
    dto: ActorMassIdPercentageInputDto,
  ): BigNumber {
    const { actors, actorType, massIdDocument, rewardDistribution } = dto;

    let actorMassIdPercentage = rewardDistribution;
    const rewardDistributions =
      this.getRewardsDistributionActorTypePercentages(massIdDocument);
    const wasteGeneratorRewardDistribution =
      rewardDistributions['Waste Generator'];

    if (actorType === RewardsDistributionActorType.WASTE_GENERATOR) {
      actorMassIdPercentage = this.getWasteGeneratorActorMassIdPercentage(
        massIdDocument,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
      );
    }

    if (actorType === RewardsDistributionActorType.APPOINTED_NGO) {
      const sourcePercentage = getNgoActorMassIdPercentage(
        massIdDocument,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
        this.getWasteGeneratorActorMassIdFullPercentage.bind(this),
      );

      actorMassIdPercentage = actorMassIdPercentage.plus(sourcePercentage);
    }

    if (!isWasteOriginIdentified(massIdDocument)) {
      const additionalPercentage = getWasteGeneratorAdditionalPercentage(
        actors,
        rewardDistributions,
      );

      actorMassIdPercentage = calculatePercentageForUnidentifiedWasteOrigin({
        actors,
        actorType,
        additionalPercentage,
        basePercentage: actorMassIdPercentage,
        rewardDistributions,
        wasteGeneratorPercentage: wasteGeneratorRewardDistribution,
      });
    }

    return actorMassIdPercentage;
  }

  private getActorRewards({
    massIdDocument,
    methodologyDocument,
  }: {
    massIdDocument: Document;
    methodologyDocument: Document;
  }): ActorReward[] {
    const result: ActorReward[] = [];
    const actors = this.getRewardsDistributionActors(massIdDocument);
    const distributions =
      this.getRewardsDistributionActorTypePercentages(massIdDocument);

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
          const massIdPercentage = this.getActorMassIdPercentage({
            actors,
            actorType,
            massIdDocument,
            rewardDistribution,
          }).div(actorsByType.length);

          result.push(
            ...actorsByType.map(({ participant, type }) =>
              mapActorReward({
                actorType: type,
                massIdDocument,
                massIdPercentage,
                participant,
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
          participant: {
            id: event.participant.id,
            name: event.participant.name,
          },
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
    const documentSubtype = this.extractMassIdSubtype(document);
    const wasteType = REWARDS_DISTRIBUTION_BY_WASTE_TYPE[documentSubtype];

    return REWARDS_DISTRIBUTION[wasteType];
  }

  private getWasteGeneratorActorMassIdFullPercentage(
    document: Document,
    actorMassIdPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    if (isWasteOriginIdentified(document)) {
      return actorMassIdPercentage.plus(
        getWasteGeneratorAdditionalPercentage(actors, rewardDistributions),
      );
    }

    return new BigNumber(0);
  }

  private getWasteGeneratorActorMassIdPercentage(
    document: Document,
    actorMassIdPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    const fullPercentage = this.getWasteGeneratorActorMassIdFullPercentage(
      document,
      actorMassIdPercentage,
      actors,
      rewardDistributions,
    );

    // TODO: Today all waste generators are eligible for the discount, but we need to apply it only to large source companies based on the homologation document
    return fullPercentage.multipliedBy(1 - LARGE_REVENUE_BUSINESS_DISCOUNT);
  }
}
