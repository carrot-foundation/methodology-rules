import type {
  MethodologyAuthor,
  MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import { random } from 'typia';

export const stubParticipant = (
  partialParticipant?: PartialDeep<MethodologyParticipant>,
): MethodologyParticipant => ({
  ...random<MethodologyParticipant>(),
  ...partialParticipant,
});

export const stubAuthor = (
  partialAuthor?: PartialDeep<MethodologyAuthor>,
): MethodologyAuthor => ({
  ...random<MethodologyAuthor>(),
  ...partialAuthor,
});
