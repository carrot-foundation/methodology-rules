import { getDocumentBucketName } from '@carrot-fndn/shared/env';
import { S3BucketRepository } from '@carrot-fndn/shared/s3-bucket';

export class DocumentRepository extends S3BucketRepository {
  constructor() {
    super(getDocumentBucketName());
  }
}
