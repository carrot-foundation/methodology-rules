import {
  BigNumberStringSchema,
  DocumentParticipantSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const RewardsDistributionActorType = {
  COMMUNITY_IMPACT_POOL: 'Community Impact Pool',
  HAULER: 'Hauler',
  INTEGRATOR: 'Integrator',
  METHODOLOGY_AUTHOR: 'Methodology Author',
  METHODOLOGY_DEVELOPER: 'Methodology Developer',
  NETWORK: 'Network',
  PROCESSOR: 'Processor',
  RECYCLER: 'Recycler',
  WASTE_GENERATOR: 'Waste Generator',
} as const;
export const RewardsDistributionActorTypeSchema = z.enum(
  Object.values(RewardsDistributionActorType) as [string, ...string[]],
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type RewardsDistributionActorType = z.infer<
  typeof RewardsDistributionActorTypeSchema
>;

export const RewardsDistributionWasteType = {
  MIXED_ORGANIC_WASTE: 'Mixed Organic Waste',
  SLUDGE_FROM_WASTE_TREATMENT: 'Sludge from Waste Treatment',
  TOBACCO_INDUSTRY_RESIDUES: 'Tobacco Industry Residues',
} as const;
export const RewardsDistributionWasteTypeSchema = z.enum(
  Object.values(RewardsDistributionWasteType) as [string, ...string[]],
);
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export type RewardsDistributionWasteType = z.infer<
  typeof RewardsDistributionWasteTypeSchema
>;

export const RewardsDistributionActorAddressSchema = z.object({
  id: NonEmptyStringSchema,
});
export type RewardsDistributionActorAddress = z.infer<
  typeof RewardsDistributionActorAddressSchema
>;

export const RewardsDistributionActorParticipantSchema =
  DocumentParticipantSchema.pick({
    id: true,
    name: true,
  });
export type RewardsDistributionActorParticipant = z.infer<
  typeof RewardsDistributionActorParticipantSchema
>;

export const RewardsDistributionCertificateRewardSchema = z.object({
  actorType: RewardsDistributionActorTypeSchema,
  participant: RewardsDistributionActorParticipantSchema,
  percentage: BigNumberStringSchema,
});
export type RewardsDistributionCertificateReward = z.infer<
  typeof RewardsDistributionCertificateRewardSchema
>;

export const RewardsDistributionMassIDRewardSchema = z.object({
  actorType: RewardsDistributionActorTypeSchema,
  address: RewardsDistributionActorAddressSchema,
  massIDPercentage: BigNumberStringSchema,
  participant: RewardsDistributionActorParticipantSchema,
  preserveSensitiveData: z.boolean().optional(),
});
export type RewardsDistributionMassIDReward = z.infer<
  typeof RewardsDistributionMassIDRewardSchema
>;

export const RewardsDistributionResultContentSchema = z.object({
  massIDDocumentId: NonEmptyStringSchema,
  massIDRewards: z.array(RewardsDistributionMassIDRewardSchema).nonempty(),
});
export type RewardsDistributionResultContent = z.infer<
  typeof RewardsDistributionResultContentSchema
>;
