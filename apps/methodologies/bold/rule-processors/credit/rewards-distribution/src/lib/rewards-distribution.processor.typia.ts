import type { CertificateRewardDistributionOutput } from '@carrot-fndn/shared/methodologies/bold/types';

import { createIs } from 'typia';

export const isCertificateRewardDistributionOutput =
  createIs<CertificateRewardDistributionOutput>();
