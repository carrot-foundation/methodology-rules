import { z } from 'zod';

import type { CheckDuplicatesDto } from './audit.api.dto';

const CheckDuplicatesDtoSchema = z.strictObject({
  match: z.record(z.string(), z.any()),
});

export const assertCheckDuplicatesDto = (v: unknown): CheckDuplicatesDto =>
  CheckDuplicatesDtoSchema.parse(v);
