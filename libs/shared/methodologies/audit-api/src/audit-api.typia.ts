import { createAssertEquals } from 'typia';

import type { CheckDuplicatesDto } from './audit.api.dto';

export const assertCheckDuplicatesDto =
  createAssertEquals<CheckDuplicatesDto>();
