import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { getDocumentBucketName } from '@carrot-fndn/shared/env';
import { logger } from '@carrot-fndn/shared/helpers';
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
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
      ).toEqual({ Bucket: getDocumentBucketName(), Key: key });
    });

    it('should return missing and log the key when the object does not exist', async () => {
      const key = faker.string.uuid();

      s3ClientMock
        .on(GetObjectCommand)
        .rejects(new NoSuchKey({ $metadata: {}, message: 'Not found' }));

      await expect(loadConnectionEvidence(key)).resolves.toEqual({
        status: 'missing',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        { key },
        '[loadConnectionEvidence] Evidence not found',
      );
    });

    it('should return malformed and log the reason when the object is not JSON', async () => {
      const key = faker.string.uuid();
      const reason = 'the body is not valid JSON';

      resolveBody('not-json');

      await expect(loadConnectionEvidence(key)).resolves.toEqual({
        reason,
        status: 'malformed',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        { key, reason },
        '[loadConnectionEvidence] Evidence is malformed',
      );
    });

    it('should return malformed with the schema issues when the object is version 1 evidence', async () => {
      resolveBody(
        JSON.stringify({ ...stubMassIDConnectionEvidence(), version: 1 }),
      );

      await expect(
        loadConnectionEvidence(faker.string.uuid()),
      ).resolves.toEqual({
        reason: expect.stringContaining('version'),
        status: 'malformed',
      });
    });

    it('should rethrow a missing bucket configuration instead of reporting malformed evidence', async () => {
      vi.stubEnv('DOCUMENT_BUCKET_NAME', '');

      await expect(loadConnectionEvidence(faker.string.uuid())).rejects.toThrow(
        'DOCUMENT_BUCKET_NAME',
      );
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
