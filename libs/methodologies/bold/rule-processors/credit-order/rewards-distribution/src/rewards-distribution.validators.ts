import type { CertificateRewardDistributionOutput } from '@carrot-fndn/shared/methodologies/bold/types';

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
    }),
  ),
});

export const isCertificateRewardDistributionOutput = (
  value: unknown,
): value is CertificateRewardDistributionOutput =>
  CertificateRewardDistributionOutputSchema.safeParse(value).success;
