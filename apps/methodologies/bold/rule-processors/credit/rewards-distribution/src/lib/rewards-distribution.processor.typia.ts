import type { CertificateRewardDistributionOutput } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import type { NonZeroPositive } from '@carrot-fndn/shared/types';

import { createIs } from 'typia';

export const isCertificateRewardDistributionOutput =
  createIs<CertificateRewardDistributionOutput>();
export const isNumber = createIs<number>();
export const isNonZeroPositive = createIs<NonZeroPositive>();
