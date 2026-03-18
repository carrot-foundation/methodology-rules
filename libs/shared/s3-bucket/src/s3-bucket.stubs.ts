import { faker } from '@faker-js/faker';
import { z } from 'zod';

const S3BucketTestDataSchema = z.object({
  a: z.number(),
  b: z.string(),
  c: z.boolean(),
});

type S3BucketTestData = z.infer<typeof S3BucketTestDataSchema>;

export const assertS3BucketTestData = (input: unknown): S3BucketTestData =>
  S3BucketTestDataSchema.parse(input);

export const stubS3BucketTestData = (): S3BucketTestData => ({
  a: faker.number.int(),
  b: faker.string.alpha(),
  c: faker.datatype.boolean(),
});
