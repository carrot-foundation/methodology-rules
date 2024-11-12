import { DocumentEventActorType } from '@carrot-fndn/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type { ResultContentWithMassValue } from './rewards-distribution.types';

export const RESULT_CONTET_WITH_MASS_VALUE_STUB: ResultContentWithMassValue[] =
  [
    {
      massValue: new BigNumber('24.419'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'ighgvmph', name: 'okhwrgefhcnxyaaoekkm' },
            percentage: '12',
          },
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'ighgvmph', name: 'okhwrgefhcnxyaaoekkm' },
            percentage: '7.711408',
          },
          {
            actorType: DocumentEventActorType.INTEGRATOR,
            participant: { id: 'ptmeahooevs', name: 'i' },
            percentage: '17.986262',
          },
          {
            actorType: DocumentEventActorType.RECYCLER,
            participant: { id: 'ygioqpnmjcak', name: 'iasf' },
            percentage: '17.95633',
          },
          {
            actorType: DocumentEventActorType.NETWORK,
            participant: {
              id: 'ttewegtjrygioqpnmjcak',
              name: 'wupdjxggyfsxb',
            },
            percentage: '44.346',
          },
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('91.6575'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'ighgvmph', name: 'okhwrgefhcnxyaaoekkm' },
            percentage: '41',
          },
          {
            actorType: DocumentEventActorType.INTEGRATOR,
            participant: { id: 'ptmeahooevs', name: 'i' },
            percentage: '45',
          },
          {
            actorType: DocumentEventActorType.NETWORK,
            participant: {
              id: 'ttewegtjrygioqpnmjcak',
              name: 'wupdjxggyfsxb',
            },
            percentage: '14',
          },
        ],
        massRewards: [] as never,
      },
    },
  ];
