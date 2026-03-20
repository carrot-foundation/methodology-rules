import { S3Client } from '@aws-sdk/client-s3';
import { stubObject } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { DocumentRepository } from './document.repository';
import { stubDocumentEntity } from './document.stubs';
import { assertDocumentEntity } from './document.validators';

vi.mock('@aws-sdk/client-s3');

vi.mock('@carrot-fndn/shared/env', () => ({
  getDocumentBucketName: () => 'test-bucket',
}));

describe('DocumentRepository', () => {
  const repository = new DocumentRepository();

  describe('readFromS3', () => {
    it('should throw error if stored data is invalid', async () => {
      const data = stubObject();

      vi.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({
        Body: {
          transformToString: () => JSON.stringify(data),
        },
      } as never);

      await expect(
        repository.readFromS3(faker.string.uuid(), assertDocumentEntity),
      ).rejects.toThrow();
    });

    it('should return the stored data', async () => {
      const data = stubDocumentEntity();

      vi.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({
        Body: {
          transformToString: () => JSON.stringify(data),
        },
      } as never);

      const result = await repository.readFromS3(
        faker.string.uuid(),
        assertDocumentEntity,
      );

      expect(result).toEqual(data);
    });
  });
});
