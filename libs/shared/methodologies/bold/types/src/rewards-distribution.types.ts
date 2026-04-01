import {
  BigNumberStringSchema,
  DocumentParticipantSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export enum RewardsDistributionActorType {
  COMMUNITY_IMPACT_POOL = 'Community Impact Pool',
  HAULER = 'Hauler',
  INTEGRATOR = 'Integrator',
  METHODOLOGY_AUTHOR = 'Methodology Author',
  METHODOLOGY_DEVELOPER = 'Methodology Developer',
  NETWORK = 'Network',
  PROCESSOR = 'Processor',
  RECYCLER = 'Recycler',
  WASTE_GENERATOR = 'Waste Generator',
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

export const RewardActorParticipantSchema = DocumentParticipantSchema.pick({
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
