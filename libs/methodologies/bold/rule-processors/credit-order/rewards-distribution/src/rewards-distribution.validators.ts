import type { RewardsDistributionResultContent } from '@carrot-fndn/shared/methodologies/bold/types';

import { z } from 'zod';

const CertificateRewardDistributionOutputSchema = z.object({
  massIDDocumentId: z.string().nonempty(),
  massIDRewards: z.array(
    z.object({
      actorType: z.string().nonempty(),
      address: z.object({ id: z.string().nonempty() }),
      massIDPercentage: z.string().nonempty(),
      participant: z.object({
        id: z.string().nonempty(),
        name: z.string().nonempty(),
      }),
      preserveSensitiveData: z.boolean().optional(),
    }),
  ),
});

export const isCertificateRewardDistributionOutput = (
  value: unknown,
): value is RewardsDistributionResultContent =>
  CertificateRewardDistributionOutputSchema.safeParse(value).success;
