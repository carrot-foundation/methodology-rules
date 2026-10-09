import { NoSuchKey } from '@aws-sdk/client-s3';
import { getDocumentBucketName } from '@carrot-fndn/shared/env';
import {
  type MassIDConnectionEvidence,
  MassIDConnectionEvidenceSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { S3BucketRepository } from '@carrot-fndn/shared/s3-bucket';
import { z } from 'zod';

export type ConnectionEvidenceLoadResult =
  | { evidence: MassIDConnectionEvidence; status: 'found' }
  | { reason: string; status: 'malformed' }
  | { status: 'missing' };

class ConnectionEvidenceRepository extends S3BucketRepository {
  constructor() {
    super(getDocumentBucketName());
  }
}

export const toConnectionEvidenceKey = ({
  documentId,
  documentKeyPrefix,
}: {
  documentId: string;
  documentKeyPrefix: string;
}): string => `${documentKeyPrefix}/${documentId}.connection-evidence.json`;

export const loadConnectionEvidence = async (
  key: string,
): Promise<ConnectionEvidenceLoadResult> => {
  try {
    const evidence = await new ConnectionEvidenceRepository().readFromS3(
      key,
      (body) => MassIDConnectionEvidenceSchema.parse(body),
    );

    return { evidence, status: 'found' };
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return { status: 'missing' };
    }

    if (error instanceof z.ZodError) {
      return { reason: z.prettifyError(error), status: 'malformed' };
    }

    if (error instanceof SyntaxError) {
      return { reason: error.message, status: 'malformed' };
    }

    throw error;
  }
};
