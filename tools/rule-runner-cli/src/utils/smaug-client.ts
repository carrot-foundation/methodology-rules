import { logger } from '@carrot-fndn/shared/helpers';
import { httpRequest } from '@carrot-fndn/shared/http-request';

export interface DryRunPrepareResponse {
  auditDocumentId: string;
  auditedDocumentId: string;
  executionId: string;
  rules: DryRunPrepareRule[];
}

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
  const url = `${smaugUrl}/methodologies/dry-run/prepare`;

  logger.info(`Calling Smaug dry-run prepare: ${url}`);

  const response = await httpRequest({
    data: request,
    method: 'POST',
    url,
  });

  if (!response || response.status >= 400) {
    const errorBody =
      response?.data !== undefined && response.data !== null
        ? JSON.stringify(response.data, undefined, 2)
        : 'No response body';

    throw new Error(
      `Smaug dry-run prepare failed (HTTP ${String(response?.status ?? 'N/A')}): ${errorBody}`,
    );
  }

  return response.data as DryRunPrepareResponse;
};
