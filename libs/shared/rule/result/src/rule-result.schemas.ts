import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import z from 'zod';

export const PostProcessInputSchema = z.object({
  output: z.object({
    artifactChecksum: z.string(),
    comment: z.string().optional(),
    content: z.record(z.string(), z.any()).optional(),
    sourceCodeUrl: z.url(),
    sourceCodeVersion: z.string(),
    status: z.enum(RuleOutputStatus),
  }),
  taskToken: z.string(),
});
export type PostProcessInput = z.infer<typeof PostProcessInputSchema>;

export const CredentialsSchema = z.object({
  AccessKeyId: z.string(),
  Expiration: z.date().optional(),
  SecretAccessKey: z.string(),
  SessionToken: z.string(),
});
export type Credentials = z.infer<typeof CredentialsSchema>;
