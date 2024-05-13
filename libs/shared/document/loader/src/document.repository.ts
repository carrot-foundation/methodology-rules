import { S3BucketRepository } from '@carrot-fndn/shared/s3-bucket';

export class DocumentRepository extends S3BucketRepository {
  constructor() {
    super(process.env['DOCUMENT_BUCKET_NAME'] as string);
  }
}
