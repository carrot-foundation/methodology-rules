import type { Address } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import type { PartialDeep } from 'type-fest';

import { random } from 'typia';

export const stubAddress = (
  partialAddress?: PartialDeep<Address>,
): Address => ({
  ...random<Address>(),
  ...partialAddress,
});
