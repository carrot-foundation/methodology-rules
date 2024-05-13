import { createAssert, random } from 'typia';

interface S3BucketTestData {
  a: number;
  b: string;
  c: boolean;
}

export const assertS3BucketTestData = createAssert<S3BucketTestData>();

export const stubS3BucketTestData = () => random<S3BucketTestData>();
