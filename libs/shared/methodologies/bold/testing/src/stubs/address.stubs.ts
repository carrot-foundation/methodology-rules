import type { MethodologyAddress } from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import { random } from 'typia';

export const stubAddress = (
  partialAddress: PartialDeep<MethodologyAddress> = {},
): MethodologyAddress => ({
  ...random<MethodologyAddress>(),
  ...partialAddress,
});
