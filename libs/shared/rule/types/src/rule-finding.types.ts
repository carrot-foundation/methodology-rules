import { z } from 'zod';

export const FindingOwnerSchema = z.enum([
  'CARROT',
  'INTEGRATOR',
  'RECYCLER',
  'TO_CONFIRM',
]);
export type FindingOwner = z.infer<typeof FindingOwnerSchema>;

export const RuleFindingSchema = z.object({
  code: z.string(),
  defaultOwner: FindingOwnerSchema,
  dependsOnAccreditation: z.string().optional(),
});
export type RuleFinding = z.infer<typeof RuleFindingSchema>;
