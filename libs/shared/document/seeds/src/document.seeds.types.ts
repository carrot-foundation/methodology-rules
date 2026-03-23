import type {
  AnyObject,
  DateTime,
  MethodologyDocument,
  NonEmptyString,
} from '@carrot-fndn/shared/types';

export interface ApiDocumentCreateDto
  extends Omit<
    AuditApiDocumentPrimitiveEntity,
    'createdAt' | 'id' | 'versionDate'
  > {
  parts?: AuditApiDocumentPartSnapshotEntity[] | undefined;
  versionDate: DateTime;
}

export interface AuditApiDocumentPartSnapshotEntity<
  T extends AnyObject = AnyObject,
> {
  part: T;
  partId: NonEmptyString;
  path: NonEmptyString;
}

export interface AuditApiDocumentPrimitiveEntity {
  createdAt: DateTime;
  document: MethodologyDocument;
  documentId: string;
  snapshotId: string;
  versionDate: DateTime;
}
