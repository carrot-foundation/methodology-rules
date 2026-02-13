import { httpRequest } from '@carrot-fndn/shared/http-request';
import { logger } from '@carrot-fndn/shared/helpers';

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

export interface DryRunPrepareResponse {
  auditDocumentId: string;
  auditedDocumentId: string;
  executionId: string;
  rules: DryRunPrepareRule[];
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

  return response?.data as DryRunPrepareResponse;
};
