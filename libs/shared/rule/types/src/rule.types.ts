import { DocumentIdSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

export enum RuleOutputStatus {
  FAILED = 'FAILED',
  PASSED = 'PASSED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export const RuleEnvironmentSchema = z.enum(['DEVELOPMENT', 'PRODUCTION']);
export interface IRuleDataProcessor {
  process(data: RuleInput): Promise<RuleOutput>;
}

export type RuleEnvironment = z.infer<typeof RuleEnvironmentSchema>;

export const RuleInputSchema = z.object({
  documentId: DocumentIdSchema,
  documentKeyPrefix: z.string().nonempty(),
  environment: RuleEnvironmentSchema.optional(),
  parentDocumentId: DocumentIdSchema.optional(),
  requestId: z.string(),
  responseToken: z.string(),
  responseUrl: z.url(),
  ruleName: z.string().optional(),
});
export type RuleInput = z.infer<typeof RuleInputSchema>;

export const RuleOutputSchema = z.object({
  requestId: z.string(),
  responseToken: z.string(),
  responseUrl: z.url(),
  resultComment: z.string().optional(),
  resultContent: z.record(z.string(), z.any()).optional(),
  resultStatus: z.enum(RuleOutputStatus),
});
export type RuleOutput = z.infer<typeof RuleOutputSchema>;
