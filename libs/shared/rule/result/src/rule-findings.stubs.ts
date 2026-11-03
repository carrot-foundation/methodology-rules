import type { FindingMeta } from './rule-findings';

export const stubFindingMeta = (
  partial: Partial<FindingMeta> = {},
): FindingMeta => ({
  category: 'INVALID_DATA',
  defaultOwner: 'INTEGRATOR',
  description: 'Descrição fictícia do achado.',
  guidance: 'Orientação fictícia ao integrador.',
  title: 'Achado fictício',
  ...partial,
});
