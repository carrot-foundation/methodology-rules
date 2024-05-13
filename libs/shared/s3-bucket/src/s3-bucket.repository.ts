import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type Primitive, assertEquals } from 'typia';

export abstract class S3BucketRepository {
  protected constructor(protected readonly S3_BUCKET_NAME: string) {}

  async readFromS3<T>(
    key: string,
    assertBody: typeof assertEquals<Primitive<T>>,
  ): Promise<Primitive<T>> {
    const { Body } = await new S3Client().send(
      new GetObjectCommand({
        Bucket: this.S3_BUCKET_NAME,
        Key: key,
      }),
    );

    const body: unknown = JSON.parse(
      (await Body?.transformToString()) as string,
    );

    return assertBody(body as T);
  }
}
