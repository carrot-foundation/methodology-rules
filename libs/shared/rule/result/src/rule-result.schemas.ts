import { RuleOutputStatusSchema } from '@carrot-fndn/shared/rule/types';
import z from 'zod';

export const PostProcessInputSchema = z.object({
  output: z.object({
    artifactChecksum: z.string(),
    comment: z.string().optional(),
    content: z.record(z.string(), z.any()).optional(),
    sourceCodeUrl: z.url(),
    sourceCodeVersion: z.string(),
    status: RuleOutputStatusSchema,
  }),
  taskToken: z.string(),
});
export type PostProcessInput = z.infer<typeof PostProcessInputSchema>;
