import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export abstract class S3BucketRepository {
  private readonly S3_BUCKET_NAME: string;

  protected constructor(S3_BUCKET_NAME: string) {
    this.S3_BUCKET_NAME = S3_BUCKET_NAME;
  }

  async readFromS3<T>(
    key: string,
    assertBody: (input: unknown) => T,
  ): Promise<T> {
    const { Body } = await new S3Client().send(
      new GetObjectCommand({
        Bucket: this.S3_BUCKET_NAME,
        Key: key,
      }),
    );

    const body: unknown = JSON.parse(
      (await Body?.transformToString()) as string,
    );

    return assertBody(body);
  }
}
