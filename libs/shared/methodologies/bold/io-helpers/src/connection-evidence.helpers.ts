import { NoSuchKey } from '@aws-sdk/client-s3';
import { getDocumentBucketName } from '@carrot-fndn/shared/env';
import { logger } from '@carrot-fndn/shared/helpers';
import {
  type MassIDConnectionEvidence,
  MassIDConnectionEvidenceSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { S3BucketRepository } from '@carrot-fndn/shared/s3-bucket';
import { z } from 'zod';

export type MassIDConnectionEvidenceLoadResult =
  | { evidence: MassIDConnectionEvidence; status: 'found' }
  | { reason: string; status: 'malformed' }
  | { status: 'missing' };

class ConnectionEvidenceRepository extends S3BucketRepository {
  constructor() {
    super(getDocumentBucketName());
  }
}

const describeMalformedEvidence = (error: unknown): string | undefined => {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }

  // SyntaxError messages quote the body, which must not reach the rule result.
  return error instanceof SyntaxError
    ? 'the body is not valid JSON'
    : undefined;
};

export const toConnectionEvidenceKey = ({
  documentId,
  documentKeyPrefix,
}: {
  documentId: string;
  documentKeyPrefix: string;
}): string => `${documentKeyPrefix}/${documentId}.connection-evidence.json`;

export const loadConnectionEvidence = async (
  key: string,
): Promise<MassIDConnectionEvidenceLoadResult> => {
  const repository = new ConnectionEvidenceRepository();

  try {
    const evidence = await repository.readFromS3(key, (body) =>
      MassIDConnectionEvidenceSchema.parse(body),
    );

    return { evidence, status: 'found' };
  } catch (error) {
    if (error instanceof NoSuchKey) {
      logger.warn({ key }, '[loadConnectionEvidence] Evidence not found');

      return { status: 'missing' };
    }

    const malformedReason = describeMalformedEvidence(error);

    if (malformedReason === undefined) {
      throw error;
    }

    logger.warn(
      { key, reason: malformedReason },
      '[loadConnectionEvidence] Evidence is malformed',
    );

    return { reason: malformedReason, status: 'malformed' };
  }
};
