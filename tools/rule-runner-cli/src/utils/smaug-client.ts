import type { DocumentQueryCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import { provideSmaugApiCredentials } from '@carrot-fndn/shared/aws-http';
import { logger } from '@carrot-fndn/shared/helpers';
import { httpRequest } from '@carrot-fndn/shared/http-request';
import {
  type DataSetName,
  DocumentIdSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

const DryRunPrepareIdentifierShape = {
  auditDocumentId: DocumentIdSchema,
  auditedDocumentId: DocumentIdSchema,
  executionId: NonEmptyStringSchema,
};

const DryRunPrepareResponseSchema = z.object({
  ...DryRunPrepareIdentifierShape,
  rules: z.array(
    z.object({
      executionOrder: z.number(),
      ruleId: z.string(),
      ruleName: z.string(),
      ruleScope: z.string(),
      ruleSlug: z.string(),
    }),
  ),
});

export type DryRunPrepareResponse = z.infer<typeof DryRunPrepareResponseSchema>;

export interface LocalRuleDryRunPrepareRequest {
  dataSetName: DataSetName;
  documentId: string;
  input?: DocumentQueryCriteria;
  ruleSlug: string;
  rulesScope: 'MassID';
}

const LocalRuleDryRunPrepareResponseSchema = z.strictObject({
  ...DryRunPrepareIdentifierShape,
});

export type LocalRuleDryRunPrepareResponse = z.infer<
  typeof LocalRuleDryRunPrepareResponseSchema
>;

interface DryRunPrepareRequest {
  documentId: string;
  methodologySlug: string;
  ruleSlug?: string;
  rulesScope: string;
}

export const prepareDryRun = async (
  smaugUrl: string,
  request: DryRunPrepareRequest,
): Promise<DryRunPrepareResponse> => {
  logger.info('Calling Smaug dry-run prepare');

  const response = await httpRequest(
    {
      baseURL: smaugUrl,
      data: request,
      method: 'POST',
      url: '/methodologies/dry-run/prepare',
    },
    { credentials: provideSmaugApiCredentials() },
  );

  if (!response || response.status >= 400) {
    throw new Error(
      `Smaug dry-run prepare failed (HTTP ${String(response?.status ?? 'N/A')})`,
    );
  }

  const result = DryRunPrepareResponseSchema.safeParse(response.data);

  if (!result.success) {
    throw new Error('Smaug dry-run preparation response is invalid');
  }

  return result.data;
};

export const prepareLocalRule = async (
  smaugUrl: string,
  request: LocalRuleDryRunPrepareRequest,
): Promise<LocalRuleDryRunPrepareResponse> => {
  const response = await httpRequest(
    {
      baseURL: smaugUrl,
      data: request,
      method: 'POST',
      url: '/methodologies/dry-run/prepare-local-rule',
    },
    { credentials: provideSmaugApiCredentials() },
  );

  if (!response || response.status >= 400) {
    throw new Error(
      `Smaug local rule preparation failed (HTTP ${String(response?.status ?? 'N/A')})`,
    );
  }

  const result = LocalRuleDryRunPrepareResponseSchema.safeParse(response.data);

  if (!result.success) {
    throw new Error('Smaug local rule preparation response is invalid');
  }

  return result.data;
};
