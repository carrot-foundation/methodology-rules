import { type Credentials } from '@aws-sdk/client-sts';
import { RuleOutputSchema } from '@carrot-fndn/shared/rule/types';
import { z } from 'zod';

export const assertString = (v: unknown): string => z.string().parse(v);

const CredentialsSchema = z.object({
  AccessKeyId: z.string(),
  Expiration: z.date().optional(),
  SecretAccessKey: z.string(),
  SessionToken: z.string(),
});

export const assertCredentials = (v: unknown): Credentials =>
  CredentialsSchema.parse(v) as Credentials;

export const assertRuleOutput = (v: unknown) => RuleOutputSchema.parse(v);
