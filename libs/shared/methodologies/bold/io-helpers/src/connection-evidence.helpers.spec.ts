import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { stubMassIDConnectionEvidence } from '@carrot-fndn/shared/methodologies/bold/testing';
import { faker } from '@faker-js/faker';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'node:stream';

import {
  loadConnectionEvidence,
  toConnectionEvidenceKey,
} from './connection-evidence.helpers';

const s3ClientMock = mockClient(S3Client);

const resolveBody = (body: string) => {
  s3ClientMock
    .on(GetObjectCommand)
    .resolves({ Body: sdkStreamMixin(Readable.from([body])) });
};

describe('Connection evidence helpers', () => {
  beforeEach(() => {
    s3ClientMock.reset();
  });

  describe('toConnectionEvidenceKey', () => {
    it('should place the evidence next to the execution document', () => {
      const documentId = faker.string.uuid();
      const documentKeyPrefix = `${faker.string.uuid()}/documents`;

      expect(toConnectionEvidenceKey({ documentId, documentKeyPrefix })).toBe(
        `${documentKeyPrefix}/${documentId}.connection-evidence.json`,
      );
    });
  });

  describe('loadConnectionEvidence', () => {
    it('should return the parsed evidence when the object is valid', async () => {
      const evidence = stubMassIDConnectionEvidence();
      const key = faker.string.uuid();

      resolveBody(JSON.stringify(evidence));

      await expect(loadConnectionEvidence(key)).resolves.toEqual({
        evidence,
        status: 'found',
      });
      expect(
        s3ClientMock.commandCalls(GetObjectCommand)[0]?.args[0].input,
      ).toEqual(expect.objectContaining({ Key: key }));
    });

    it('should return missing when the object does not exist', async () => {
      s3ClientMock
        .on(GetObjectCommand)
        .rejects(new NoSuchKey({ $metadata: {}, message: 'Not found' }));

      await expect(
        loadConnectionEvidence(faker.string.uuid()),
      ).resolves.toEqual({ status: 'missing' });
    });

    it('should return malformed when the object is not JSON', async () => {
      resolveBody('not-json');

      await expect(
        loadConnectionEvidence(faker.string.uuid()),
      ).resolves.toEqual({
        reason: expect.any(String),
        status: 'malformed',
      });
    });

    it('should return malformed with the schema issues when the object breaks the contract', async () => {
      resolveBody(
        JSON.stringify({ ...stubMassIDConnectionEvidence(), version: 2 }),
      );

      await expect(
        loadConnectionEvidence(faker.string.uuid()),
      ).resolves.toEqual({
        reason: expect.stringContaining('version'),
        status: 'malformed',
      });
    });

    it('should rethrow read failures other than a missing object', async () => {
      const error = new Error('AccessDenied');

      s3ClientMock.on(GetObjectCommand).rejects(error);

      await expect(loadConnectionEvidence(faker.string.uuid())).rejects.toBe(
        error,
      );
    });
  });
});
