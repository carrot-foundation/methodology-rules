import { afterEach } from 'node:test';
import { random } from 'typia';

import type { CheckDuplicatesDto } from './audit.api.dto';

import { AUDIT_API_URL_MAP } from './audit-api.constants';
import { AuditApiService } from './audit-api.service';

describe('AuditApiService', () => {
  let service: AuditApiService;

  beforeEach(() => {
    service = new AuditApiService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDuplicates', () => {
    it('should call the post method with the correct arguments', async () => {
      const dto = random<CheckDuplicatesDto>();

      jest.spyOn(service as any, 'post').mockResolvedValue(undefined);

      await service.checkDuplicateDocuments(dto);

      expect(service['post']).toHaveBeenCalledWith(
        `${AUDIT_API_URL_MAP.development}/documents/check-duplicates`,
        dto,
      );
    });

    it('should throw an error when the dto is invalid', async () => {
      await expect(
        service.checkDuplicateDocuments({} as never),
      ).rejects.toThrow('Error on createAssertEquals()');
    });
  });
});
