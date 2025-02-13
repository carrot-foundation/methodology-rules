import { S3Client } from '@aws-sdk/client-s3';
import { stubObject } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { createValidate } from 'typia';

import { S3BucketRepository } from './s3-bucket.repository';
import {
  assertS3BucketTestData,
  stubS3BucketTestData,
} from './s3-bucket.stubs';

jest.mock('@aws-sdk/client-s3');

const S3ClientMock = new S3Client({});

describe('S3BucketRepository', () => {
  const S3_BUCKET_NAME = faker.string.uuid();

  class S3BucketTestRepository extends S3BucketRepository {
    constructor() {
      super(S3_BUCKET_NAME);
    }
  }
  const repository = new S3BucketTestRepository();

  describe('readFromS3', () => {
    it('should throw error if Body was not returned', async () => {
      jest.spyOn(S3ClientMock, 'send').mockResolvedValueOnce({} as never);

      await expect(
        repository.readFromS3(faker.string.uuid(), createValidate),
      ).rejects.toThrow('"undefined" is not valid JSON');
    });

    it('should throw error if stored data is invalid', async () => {
      const data = stubObject();

      jest.spyOn(S3ClientMock, 'send').mockResolvedValueOnce({
        Body: {
          transformToString: () => JSON.stringify(data),
        },
      } as never);

      await expect(
        repository.readFromS3(faker.string.uuid(), assertS3BucketTestData),
      ).rejects.toThrow('Error on createAssert()');
    });

    it('should return the stored data', async () => {
      const data = stubS3BucketTestData();

      jest.spyOn(S3ClientMock, 'send').mockResolvedValueOnce({
        Body: {
          transformToString: () => JSON.stringify(data),
        },
      } as never);

      const result = await repository.readFromS3(
        faker.string.uuid(),
        assertS3BucketTestData,
      );

      expect(result).toEqual(data);
    });
  });
});
