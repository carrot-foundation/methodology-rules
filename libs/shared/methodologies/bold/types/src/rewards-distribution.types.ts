import {
  BigNumberStringSchema,
  MethodologyActorTypeSchema,
  MethodologyParticipantSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const RewardsDistributionActorTypeSchema =
  MethodologyActorTypeSchema.extract([
    'Community Impact Pool',
    'Hauler',
    'Integrator',
    'Methodology Author',
    'Methodology Developer',
    'Network',
    'Processor',
    'Recycler',
    'Waste Generator',
  ]);
export type RewardsDistributionActorType = z.infer<
  typeof RewardsDistributionActorTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const RewardsDistributionActorType =
  RewardsDistributionActorTypeSchema.enum;

export const RewardsDistributionWasteTypeSchema = z.enum([
  'Mixed Organic Waste',
  'Sludge from Waste Treatment',
  'Tobacco Industry Residues',
]);
export type RewardsDistributionWasteType = z.infer<
  typeof RewardsDistributionWasteTypeSchema
>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const RewardsDistributionWasteType =
  RewardsDistributionWasteTypeSchema.enum;

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
  actorType: RewardsDistributionActorTypeSchema,
  participant: RewardActorParticipantSchema,
  percentage: BigNumberStringSchema,
});
export type CertificateReward = z.infer<typeof CertificateRewardSchema>;

// eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves named export used by consumers
export type CertificateRewardDistributionOutput =
  RewardDistributionResultContent;

export const MassIDRewardSchema = z.object({
  actorType: RewardsDistributionActorTypeSchema,
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
