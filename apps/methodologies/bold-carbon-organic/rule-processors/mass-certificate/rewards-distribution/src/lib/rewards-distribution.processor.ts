import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/recycling/organic/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  MASS,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/methodologies/bold/recycling/organic/matchers';
import {
  and,
  isActorEvent,
  isActorEventWithSourceActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  type CertificateReward,
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  MassSubtype,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { BigNumber } from 'bignumber.js';

import type {
  ActorMassPercentageInputDto,
  ActorReward,
  RewardsDistributionActor,
  RewardsDistributionActorTypePercentage,
} from './rewards-distribution.types';

import {
  REQUIRED_ACTOR_TYPES,
  REWARDS_DISTRIBUTION,
  REWARDS_DISTRIBUTION_BY_WASTE_TYPE,
  REWARDS_DISTRIBUTION_CRITERIA,
} from './rewards-distribution.constants';
import {
  checkIfHaulerActorExists,
  formatPercentage,
  getActorsByType,
  getDocumentsTotalMassWeight,
  mapActorReward,
  mapMassRewards,
} from './rewards-distribution.helpers';
import { RewardsDistributionProcessorErrors } from './rewards-distribution.processor.errors';
import {
  isBigNumber,
  isMassSubtype,
  isRewardsDistributionActorType,
} from './rewards-distribution.processor.typia';

BigNumber.config({ DECIMAL_PLACES: 10, ROUNDING_MODE: BigNumber.ROUND_DOWN });

const LARGE_SOURCE_COMPANY_DISCOUNT = 0.5;

export class RewardsDistributionProcessor extends RuleDataProcessor {
  private checkIfHasRequiredActorTypes = ({
    actors,
    documentId,
    requiredActorTypes,
  }: {
    actors: RewardsDistributionActor[];
    documentId: string;
    requiredActorTypes: DocumentEventActorType[];
  }) => {
    const missingRequiredActors = requiredActorTypes.filter(
      (requiredActorType) =>
        !actors.some((actor) => actor.type === requiredActorType),
    );

    if (isNonEmptyArray(missingRequiredActors)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_REQUIRED_ACTORS(
          documentId,
          missingRequiredActors,
        ),
      );
    }
  };

  readonly errorProcessor = new RewardsDistributionProcessorErrors();

  private checkIfWasteOriginIsNotIdentified(document: Document): boolean {
    return Boolean(
      document.externalEvents?.some(
        and(
          isActorEventWithSourceActorType,
          (event) =>
            getEventAttributeValue(
              event,
              DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
            ) === false,
        ),
      ),
    );
  }

  private extractMassSubtype(document: Document): MassSubtype {
    if (!isMassSubtype(document.subtype)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.UNEXPECTED_DOCUMENT_SUBTYPE,
      );
    }

    return document.subtype;
  }

  private getActorMassPercentage(dto: ActorMassPercentageInputDto): BigNumber {
    const { actorType, actors, document, rewardDistribution } = dto;

    let actorMassPercentage = rewardDistribution;
    const rewardDistributions =
      this.getRewardsDistributionActorTypePercentages(document);

    if (actorType === DocumentEventActorType.SOURCE) {
      actorMassPercentage = this.getSourceActorMassPercentage(
        document,
        rewardDistributions.SOURCE,
        actors,
        rewardDistributions,
      );
    }

    if (actorType === DocumentEventActorType.APPOINTED_NGO) {
      const sourcePercentage = this.getNgoActorMassPercentage(
        document,
        rewardDistributions.SOURCE,
        actors,
        rewardDistributions,
      );

      actorMassPercentage = actorMassPercentage.plus(sourcePercentage);
    }

    if (this.checkIfWasteOriginIsNotIdentified(document)) {
      if (actorType === DocumentEventActorType.NETWORK) {
        actorMassPercentage = actorMassPercentage
          .plus(rewardDistributions.SOURCE)
          .plus(this.getSourceAdditionalPercentage(actors, rewardDistributions))
          .plus(new BigNumber(rewardDistributions.PROCESSOR).multipliedBy(0.25))
          .plus(new BigNumber(rewardDistributions.RECYCLER).multipliedBy(0.25));

        if (checkIfHaulerActorExists(actors)) {
          actorMassPercentage = actorMassPercentage.plus(
            new BigNumber(rewardDistributions.HAULER).multipliedBy(0.25),
          );
        }
      } else if (
        [
          DocumentEventActorType.HAULER,
          DocumentEventActorType.PROCESSOR,
          DocumentEventActorType.RECYCLER,
        ].includes(actorType)
      ) {
        actorMassPercentage = actorMassPercentage.multipliedBy(0.75);
      }
    }

    return actorMassPercentage;
  }

  private getActorRewards({
    massDocuments,
    methodologyDocument,
  }: {
    massDocuments: Document[];
    methodologyDocument: Document;
  }): ActorReward[] {
    const result: ActorReward[] = [];
    const totalMassOfDocuments = getDocumentsTotalMassWeight(massDocuments);

    for (const document of massDocuments) {
      const actors = this.getRewardsDistributionActors(document);

      for (const [actorType, rewardDistribution] of Object.entries(
        this.getRewardsDistributionActorTypePercentages(document),
      )) {
        if (
          isRewardsDistributionActorType(actorType) &&
          isBigNumber(rewardDistribution)
        ) {
          const actorsByType = getActorsByType({
            actorType,
            actors,
            methodologyDocument,
          });

          const massPercentage = this.getActorMassPercentage({
            actorType,
            actors,
            document,
            rewardDistribution,
          }).div(actorsByType.length);

          result.push(
            ...actorsByType.map(({ participant, type }) =>
              mapActorReward({
                actorType: type,
                document,
                massPercentage,
                participant,
                totalMassOfDocuments,
              }),
            ),
          );
        }
      }
    }

    return result;
  }

  private getCertificateRewards(actors: ActorReward[]): CertificateReward[] {
    const certificateRewardGroup = new Map<string, CertificateReward>();

    for (const actor of actors) {
      const certificateReward = certificateRewardGroup.get(
        `${actor.actorType}-${actor.participant.id}`,
      );

      certificateRewardGroup.set(`${actor.actorType}-${actor.participant.id}`, {
        actorType: actor.actorType,
        participant: actor.participant,
        percentage: new BigNumber(actor.massCertificatePercentage)
          .plus(certificateReward?.percentage ?? 0)
          .toString(),
      });
    }

    return [...certificateRewardGroup.values()].map((certificateReward) => ({
      ...certificateReward,
      percentage: formatPercentage(new BigNumber(certificateReward.percentage)),
    }));
  }

  private getNgoActorMassPercentage(
    document: Document,
    actorMassPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.getSourceActorMassFullPercentage(
      document,
      actorMassPercentage,
      actors,
      rewardDistributions,
    ).multipliedBy(LARGE_SOURCE_COMPANY_DISCOUNT);
  }

  private getRewardsDistributionActorTypePercentages(
    document: Document,
  ): RewardsDistributionActorTypePercentage {
    const documentSubtype = this.extractMassSubtype(document);

    return REWARDS_DISTRIBUTION[
      // eslint-disable-next-line security/detect-object-injection
      REWARDS_DISTRIBUTION_BY_WASTE_TYPE[documentSubtype]
    ];
  }

  private getRewardsDistributionActors(
    document: Document,
  ): RewardsDistributionActor[] {
    const actors: RewardsDistributionActor[] = [];

    if (!isNonEmptyArray(document.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          document.id,
        ),
      );
    }

    const actorEvents = document.externalEvents.filter((event) =>
      isActorEvent(event),
    );

    for (const event of actorEvents) {
      const actorType = getEventAttributeValue(
        event,
        DocumentEventAttributeName.ACTOR_TYPE,
      );

      if (isRewardsDistributionActorType(actorType)) {
        actors.push({
          participant: {
            id: event.participant.id,
            name: event.participant.name,
          },
          type: actorType,
        });
      }
    }

    this.checkIfHasRequiredActorTypes({
      actors,
      documentId: document.id,
      requiredActorTypes: REQUIRED_ACTOR_TYPES.MASS,
    });

    return actors;
  }

  private getSourceActorMassFullPercentage(
    document: Document,
    actorMassPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.checkIfWasteOriginIsNotIdentified(document)
      ? new BigNumber(0)
      : actorMassPercentage.plus(
          this.getSourceAdditionalPercentage(actors, rewardDistributions),
        );
  }

  private getSourceActorMassPercentage(
    document: Document,
    actorMassPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.getSourceActorMassFullPercentage(
      document,
      actorMassPercentage,
      actors,
      rewardDistributions,
    ).multipliedBy(1 - LARGE_SOURCE_COMPANY_DISCOUNT);
  }

  private getSourceAdditionalPercentage(
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    if (!checkIfHaulerActorExists(actors)) {
      return rewardDistributions.HAULER;
    }

    return BigNumber(0);
  }

  async getRuleDocuments(documentQuery: DocumentQuery<Document>): Promise<{
    massDocuments: Document[];
    methodologyDocument: Document | undefined;
  }> {
    const massDocuments: Document[] = [];
    let methodologyDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (MASS.matches(documentReference)) {
        massDocuments.push(document);
      }

      if (METHODOLOGY_DEFINITION.matches(documentReference)) {
        methodologyDocument = document;
      }
    });

    return {
      massDocuments,
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

      // TODO: refactor to return actorRewards here [https://app.clickup.com/t/3005225/CARROT-734]
      const { massDocuments, methodologyDocument } =
        await this.getRuleDocuments(documentLoader);

      if (massDocuments.length === 0) {
        throw this.errorProcessor.getKnownError(
          this.errorProcessor.ERROR_MESSAGE.MASS_DOCUMENTS_NOT_FOUND,
        );
      }

      if (isNil(methodologyDocument)) {
        throw this.errorProcessor.getKnownError(
          this.errorProcessor.ERROR_MESSAGE.METHODOLOGY_DOCUMENT_NOT_FOUND,
        );
      }

      const actorRewards = this.getActorRewards({
        massDocuments,
        methodologyDocument,
      });

      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultContent: {
          certificateRewards: this.getCertificateRewards(actorRewards),
          massRewards: mapMassRewards(actorRewards),
        },
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }
}
