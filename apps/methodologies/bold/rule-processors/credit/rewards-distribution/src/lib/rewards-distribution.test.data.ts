import { DocumentEventActorType } from '@carrot-fndn/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type { ResultContentWithMassValue } from './rewards-distribution.types';

export const RESULT_CONTENT_WITH_MASS_VALUE_STUB: ResultContentWithMassValue[] =
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
            actorType: DocumentEventActorType.PROCESSOR,
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
      massValue: new BigNumber('100'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'edge_actor1', name: 'Edge Actor 1' },
            percentage: '33.3333333333',
          },
          {
            actorType: DocumentEventActorType.INTEGRATOR,
            participant: { id: 'edge_actor2', name: 'Edge Actor 2' },
            percentage: '33.3333333333',
          },
          {
            actorType: DocumentEventActorType.RECYCLER,
            participant: { id: 'edge_actor3', name: 'Edge Actor 3' },
            percentage: '33.3333333334',
          },
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('500'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'sum100_actor1', name: 'Sum100 Actor 1' },
            percentage: '50',
          },
          {
            actorType: DocumentEventActorType.RECYCLER,
            participant: { id: 'sum100_actor2', name: 'Sum100 Actor 2' },
            percentage: '50',
          },
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('0'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.INTEGRATOR,
            participant: { id: 'boundary_actor1', name: 'Boundary Actor 1' },
            percentage: '100',
          },
        ],
        massRewards: [] as never,
      },
    },
    {
      massValue: new BigNumber('9999999999.999999'),
      resultContent: {
        certificateRewards: [
          {
            actorType: DocumentEventActorType.HAULER,
            participant: { id: 'boundary_actor2', name: 'Boundary Actor 2' },
            percentage: '0.0000000001', // Minimal percentage
          },
          {
            actorType: DocumentEventActorType.PROCESSOR,
            participant: { id: 'boundary_actor3', name: 'Boundary Actor 3' },
            percentage: '99.9999999999', // Max percentage with decimal precision
          },
        ],
        massRewards: [] as never,
      },
    },
  ];
