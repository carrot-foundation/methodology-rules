import {
  type CertificateReward,
  DocumentEventActorType,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type { ResultContentWithMassValue } from './rewards-distribution.types';

const { HAULER, INTEGRATOR, NETWORK, PROCESSOR, RECYCLER } =
  DocumentEventActorType;

const createCertificateReward = (
  actorType: RewardsDistributionActorType,
  participantId: string,
  participantName: string,
  percentage: string,
): CertificateReward => ({
  actorType,
  participant: {
    id: participantId,
    name: participantName,
  },
  percentage,
});

export const RESULT_CONTENT_WITH_MASS_VALUE_STUB: ResultContentWithMassValue[] =
  [
    {
      massValue: new BigNumber('24.419'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(HAULER, 'h1', 'h1', '12'),
          createCertificateReward(HAULER, 'h1', 'h1', '7.711408'),
          createCertificateReward(INTEGRATOR, 'i1', 'i1', '17.986262'),
          createCertificateReward(RECYCLER, 'r1', 'r1', '17.95633'),
          createCertificateReward(NETWORK, 'n1', 'n1', '44.346'),
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('91.6575'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(HAULER, 'h1', 'h1', '41'),
          createCertificateReward(INTEGRATOR, 'i1', 'i1', '45'),
          createCertificateReward(NETWORK, 'n1', 'n1', '14'),
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('100'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(HAULER, 'e1', 'e1', '33.3333333333'),
          createCertificateReward(INTEGRATOR, 'e2', 'e2', '33.3333333333'),
          createCertificateReward(RECYCLER, 'e3', 'e3', '33.3333333334'),
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('500'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(HAULER, 's1', 's1', '50'),
          createCertificateReward(RECYCLER, 's2', 's2', '50'),
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('0'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(INTEGRATOR, 'b1', 'b1', '100'),
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('9999999999.999999'),
      resultContent: {
        certificateRewards: [
          createCertificateReward(HAULER, 'b2', 'b2', '0.0000000001'),
          createCertificateReward(PROCESSOR, 'b3', 'b3', '99.9999999999'),
        ],
        massRewards: [] as never,
      },
    },
  ];
