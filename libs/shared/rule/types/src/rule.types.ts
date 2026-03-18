import { z } from 'zod';

export enum RuleOutputStatus {
  FAILED = 'FAILED',
  PASSED = 'PASSED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export interface IRuleDataProcessor {
  process(data: RuleInput): Promise<RuleOutput>;
}

export type RuleEnvironment = 'DEVELOPMENT' | 'PRODUCTION';

export interface RuleInput {
  documentId: string;
  documentKeyPrefix: string;
  parentDocumentId?: string;
  requestId: string;
  responseToken: string;
  responseUrl: string;
  ruleName?: string;
  // TODO: add environment
}

export const RuleOutputSchema = z.object({
  requestId: z.string(),
  responseToken: z.string(),
  responseUrl: z.url(),
  resultComment: z.string().optional(),
  resultContent: z.record(z.string(), z.any()).optional(),
  resultStatus: z.enum(RuleOutputStatus),
});
export type RuleOutput = z.infer<typeof RuleOutputSchema>;
