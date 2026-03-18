import type { CertificateRewardDistributionOutput } from '@carrot-fndn/shared/methodologies/bold/types';

import { z } from 'zod';

const CertificateRewardDistributionOutputSchema = z.looseObject({
  massIDDocumentId: z.string().nonempty(),
  massIDRewards: z.array(
    z.looseObject({
      actorType: z.string().nonempty(),
      address: z.looseObject({ id: z.string().nonempty() }),
      massIDPercentage: z.string().nonempty(),
      participant: z.looseObject({
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
