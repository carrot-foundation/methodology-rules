import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { AwsHttpService } from '@carrot-fndn/shared/aws-http';
import axios from 'axios';

import type { CheckDuplicatesDto } from './audit.api.dto';

import { AUDIT_API_URL } from './audit-api.constants';
import { assertCheckDuplicatesDto } from './audit-api.typia';

export interface ApiDocumentCheckDuplicatesResponse {
  id: NonEmptyString;
  status: NonEmptyString;
}

export class AuditApiService extends AwsHttpService {
  constructor() {
    super(axios.create());
  }

  async checkDuplicateDocuments(
    dto: CheckDuplicatesDto,
  ): Promise<ApiDocumentCheckDuplicatesResponse[]> {
    assertCheckDuplicatesDto(dto);

    return this.post(`${AUDIT_API_URL}/documents/check-duplicates`, dto);
  }
}
