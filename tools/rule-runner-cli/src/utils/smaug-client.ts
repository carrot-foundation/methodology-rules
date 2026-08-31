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

export interface DryRunPrepareResponse {
  auditDocumentId: string;
  auditedDocumentId: string;
  executionId: string;
  rules: DryRunPrepareRule[];
}

export interface LocalRuleDryRunPrepareRequest {
  dataSetName: DataSetName;
  documentId: string;
  input?: DocumentQueryCriteria;
  ruleSlug: string;
  rulesScope: 'MassID';
}

const LocalRuleDryRunPrepareResponseSchema = z.strictObject({
  auditDocumentId: DocumentIdSchema,
  auditedDocumentId: DocumentIdSchema,
  executionId: NonEmptyStringSchema,
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

interface DryRunPrepareRule {
  executionOrder: number;
  ruleId: string;
  ruleName: string;
  ruleScope: string;
  ruleSlug: string;
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

  return response.data as DryRunPrepareResponse;
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
