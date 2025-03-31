import { seedDocument } from '@carrot-fndn/shared/document/seeds';
import { faker } from '@faker-js/faker';

import { AUDIT_API_URL } from './audit-api.constants';
import { AuditApiService } from './audit-api.service';

const endpoint = `${AUDIT_API_URL}/documents`;

jest.setTimeout(100_000);

describe('Audit API Service', () => {
  let auditApiService: AuditApiService;

  beforeAll(() => {
    auditApiService = new AuditApiService();
  });

  describe('checkDuplicateDocuments', () => {
    it('should return a empty array when no document is duplicated', async () => {
      const response = await auditApiService.checkDuplicateDocuments({
        match: {
          category: faker.string.uuid(),
          currentValue: faker.number.float(),
          subType: faker.string.uuid(),
          type: faker.string.uuid(),
        },
      });

      expect(response).toEqual([]);
    });

    it('should return a list of duplicated documents', async () => {
      const duplicatedDto = {
        category: faker.string.uuid(),
        currentValue: faker.number.float(),
        subType: faker.string.uuid(),
        type: faker.string.uuid(),
      };

      const [documentId1, documentId2] = await Promise.all([
        seedDocument({
          endpoint,
          partialDocument: duplicatedDto,
        }),
        seedDocument({
          endpoint,
          partialDocument: duplicatedDto,
        }),
      ]);

      const response = await auditApiService.checkDuplicateDocuments({
        match: {
          ...duplicatedDto,
        },
      });

      expect(response).toEqual([
        { id: documentId2, status: 'OPEN' },
        { id: documentId1, status: 'OPEN' },
      ]);
    });
  });
});
