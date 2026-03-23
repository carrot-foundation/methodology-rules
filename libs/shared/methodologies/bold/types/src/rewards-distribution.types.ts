import {
  BigNumberStringSchema,
  MethodologyActorType,
  MethodologyParticipantSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export enum RewardsDistributionActorType {
  COMMUNITY_IMPACT_POOL = MethodologyActorType.COMMUNITY_IMPACT_POOL,
  HAULER = MethodologyActorType.HAULER,
  INTEGRATOR = MethodologyActorType.INTEGRATOR,
  METHODOLOGY_AUTHOR = MethodologyActorType.METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER = MethodologyActorType.METHODOLOGY_DEVELOPER,
  NETWORK = MethodologyActorType.NETWORK,
  PROCESSOR = MethodologyActorType.PROCESSOR,
  RECYCLER = MethodologyActorType.RECYCLER,
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
}

export enum RewardsDistributionWasteType {
  MIXED_ORGANIC_WASTE = 'Mixed Organic Waste',
  SLUDGE_FROM_WASTE_TREATMENT = 'Sludge from Waste Treatment',
  TOBACCO_INDUSTRY_RESIDUES = 'Tobacco Industry Residues',
}

export const RewardActorAddressSchema = z.object({
  id: NonEmptyStringSchema,
});
export type RewardActorAddress = z.infer<typeof RewardActorAddressSchema>;

export const RewardActorParticipantSchema = MethodologyParticipantSchema.pick({
  id: true,
  name: true,
});
export type RewardActorParticipant = z.infer<
  typeof RewardActorParticipantSchema
>;

export const CertificateRewardSchema = z.object({
  actorType: z.enum(RewardsDistributionActorType),
  participant: RewardActorParticipantSchema,
  percentage: BigNumberStringSchema,
});
export type CertificateReward = z.infer<typeof CertificateRewardSchema>;

// eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves named export used by consumers
export type CertificateRewardDistributionOutput =
  RewardDistributionResultContent;

export const MassIDRewardSchema = z.object({
  actorType: z.enum(RewardsDistributionActorType),
  address: RewardActorAddressSchema,
  massIDPercentage: BigNumberStringSchema,
  participant: RewardActorParticipantSchema,
  preserveSensitiveData: z.boolean().optional(),
});
export type MassIDReward = z.infer<typeof MassIDRewardSchema>;

export const RewardDistributionResultContentSchema = z.object({
  massIDDocumentId: NonEmptyStringSchema,
  massIDRewards: z.array(MassIDRewardSchema).nonempty(),
});
export type RewardDistributionResultContent = z.infer<
  typeof RewardDistributionResultContentSchema
>;
