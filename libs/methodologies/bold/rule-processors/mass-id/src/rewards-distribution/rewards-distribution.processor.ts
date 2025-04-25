import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  eventLabelIsAnyOf,
  isActorEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  MassIdOrganicSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
import { BigNumber } from 'bignumber.js';
import { is } from 'typia';

import {
  REQUIRED_ACTOR_TYPES,
  REWARDS_DISTRIBUTION,
  REWARDS_DISTRIBUTION_BY_WASTE_TYPE,
  REWARDS_DISTRIBUTION_CRITERIA,
} from './rewards-distribution.constants';
import { RewardsDistributionProcessorErrors } from './rewards-distribution.errors';
import {
  checkIfHaulerActorExists,
  getActorsByType,
  mapActorReward,
  mapMassIdRewards,
} from './rewards-distribution.helpers';
import {
  type ActorMassIdPercentageInputDto,
  type ActorReward,
  type RewardsDistributionActor,
  type RewardsDistributionActorTypePercentage,
} from './rewards-distribution.types';

const { UNIDENTIFIED } = DocumentEventAttributeValue;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const { WASTE_GENERATOR } = MethodologyDocumentEventLabel;

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
    requiredActorTypes: RewardsDistributionActorType[];
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
        (event) => getEventAttributeValue(event, WASTE_ORIGIN) === UNIDENTIFIED,
      ) === true &&
        !document.externalEvents.some(
          (event) =>
            isActorEvent(event) && eventLabelIsAnyOf([WASTE_GENERATOR])(event),
        ),
    );
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
    const {
      actorType,
      actors,
      massIdDocument: document,
      rewardDistribution,
    } = dto;

    let actorMassPercentage = rewardDistribution;
    const rewardDistributions =
      this.getRewardsDistributionActorTypePercentages(document);
    const wasteGeneratorRewardDistribution =
      rewardDistributions['Waste Generator'];

    if (actorType === RewardsDistributionActorType.WASTE_GENERATOR) {
      actorMassPercentage = this.getWasteGeneratorActorMassIdPercentage(
        document,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
      );
    }

    if (actorType === RewardsDistributionActorType.APPOINTED_NGO) {
      const sourcePercentage = this.getNgoActorMassIdPercentage(
        document,
        wasteGeneratorRewardDistribution,
        actors,
        rewardDistributions,
      );

      actorMassPercentage = actorMassPercentage.plus(sourcePercentage);
    }

    if (this.checkIfWasteOriginIsNotIdentified(document)) {
      if (actorType === RewardsDistributionActorType.NETWORK) {
        actorMassPercentage = actorMassPercentage
          .plus(wasteGeneratorRewardDistribution)
          .plus(
            this.getWasteGeneratorAdditionalPercentage(
              actors,
              rewardDistributions,
            ),
          )
          .plus(new BigNumber(rewardDistributions.Processor).multipliedBy(0.25))
          .plus(new BigNumber(rewardDistributions.Recycler).multipliedBy(0.25));

        if (checkIfHaulerActorExists(actors)) {
          actorMassPercentage = actorMassPercentage.plus(
            new BigNumber(rewardDistributions.Hauler).multipliedBy(0.25),
          );
        }
      } else if (
        [
          RewardsDistributionActorType.HAULER,
          RewardsDistributionActorType.PROCESSOR,
          RewardsDistributionActorType.RECYCLER,
        ].includes(actorType)
      ) {
        actorMassPercentage = actorMassPercentage.multipliedBy(0.75);
      }
    }

    return actorMassPercentage;
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

    for (const [actorType, rewardDistribution] of Object.entries(
      this.getRewardsDistributionActorTypePercentages(massIdDocument),
    )) {
      if (
        is<RewardsDistributionActorType>(actorType) &&
        is<BigNumber>(rewardDistribution)
      ) {
        const actorsByType = getActorsByType({
          actorType,
          actors,
          methodologyDocument,
        });

        const massIdPercentage = this.getActorMassIdPercentage({
          actorType,
          actors,
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

    return result;
  }

  private getNgoActorMassIdPercentage(
    document: Document,
    actorMassIdPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.getWasteGeneratorActorMassIdFullPercentage(
      document,
      actorMassIdPercentage,
      actors,
      rewardDistributions,
    ).multipliedBy(LARGE_SOURCE_COMPANY_DISCOUNT);
  }

  private getRewardsDistributionActorTypePercentages(
    document: Document,
  ): RewardsDistributionActorTypePercentage {
    const documentSubtype = this.extractMassIdSubtype(document);

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

    this.checkIfHasRequiredActorTypes({
      actors,
      documentId: document.id,
      requiredActorTypes: REQUIRED_ACTOR_TYPES.MASS_ID,
    });

    return actors;
  }

  private getWasteGeneratorActorMassIdFullPercentage(
    document: Document,
    actorMassIdPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.checkIfWasteOriginIsNotIdentified(document)
      ? new BigNumber(0)
      : actorMassIdPercentage.plus(
          this.getWasteGeneratorAdditionalPercentage(
            actors,
            rewardDistributions,
          ),
        );
  }

  private getWasteGeneratorActorMassIdPercentage(
    document: Document,
    actorMassIdPercentage: BigNumber,
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    return this.getWasteGeneratorActorMassIdFullPercentage(
      document,
      actorMassIdPercentage,
      actors,
      rewardDistributions,
    ).multipliedBy(1 - LARGE_SOURCE_COMPANY_DISCOUNT);
  }

  private getWasteGeneratorAdditionalPercentage(
    actors: RewardsDistributionActor[],
    rewardDistributions: RewardsDistributionActorTypePercentage,
  ): BigNumber {
    if (!checkIfHaulerActorExists(actors)) {
      return rewardDistributions.Hauler;
    }

    return BigNumber(0);
  }

  async getRuleDocuments(documentQuery: DocumentQuery<Document>): Promise<{
    massIdDocument: Document | undefined;
    methodologyDocument: Document | undefined;
  }> {
    let massIdDocument: Document | undefined;
    let methodologyDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (MASS_ID.matches(documentReference)) {
        massIdDocument = document;
      }

      if (METHODOLOGY_DEFINITION.matches(documentReference)) {
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

      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultContent: {
          massIdDocumentId: massIdDocument.id,
          massIdRewards: mapMassIdRewards(actorRewards),
        },
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }
}
