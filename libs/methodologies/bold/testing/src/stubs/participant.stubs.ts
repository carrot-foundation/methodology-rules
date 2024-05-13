import type {
  Author,
  Participant,
} from '@carrot-fndn/methodologies/bold/types';
import type { PartialDeep } from 'type-fest';

import { random } from 'typia';

export const stubParticipant = (
  partialParticipant?: PartialDeep<Participant>,
): Participant => ({
  ...random<Participant>(),
  ...partialParticipant,
});

export const stubAuthor = (partialAuthor?: PartialDeep<Author>) => ({
  ...random<Author>(),
  ...partialAuthor,
});
