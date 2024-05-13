import { S3Client } from '@aws-sdk/client-s3';
import { stubObject } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { DocumentRepository } from './document.repository';
import { stubDocumentEntity } from './document.stubs';
import { assertDocumentEntity } from './document.validators';

jest.mock('@aws-sdk/client-s3');

const S3ClientMock = new S3Client({});

describe('DocumentRepository', () => {
  const repository = new DocumentRepository();

  describe('readFromS3', () => {
    it('should throw error if stored data is invalid', async () => {
      const data = stubObject();

      jest.spyOn(S3ClientMock, 'send').mockResolvedValueOnce({
        Body: {
          transformToString: () => JSON.stringify(data),
        },
      } as never);

      await expect(
        repository.readFromS3(faker.string.uuid(), assertDocumentEntity),
      ).rejects.toThrow('Error on typia.assert()');
    });

    it('should return the stored data', async () => {
      const data = stubDocumentEntity();

      jest.spyOn(S3ClientMock, 'send').mockResolvedValueOnce({
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
