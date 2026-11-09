import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';

export const downloadS3Object = async (
  s3Client: S3Client,
  bucket: string,
  key: string,
): Promise<Uint8Array> => {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error(`Empty response body from S3 for s3://${bucket}/${key}`);
  }

  return response.Body.transformToByteArray();
};
