import type {
  AnyObject,
  MethodologyDocument,
  NonEmptyString,
} from '@carrot-fndn/shared/types';
import type { Primitive, tags } from 'typia';

export interface AuditApiDocumentPrimitiveEntity {
  createdAt: string & tags.Format<'date-time'>;
  document: Primitive<MethodologyDocument>;
  documentId: string;
  snapshotId: string;
  versionDate: string & tags.Format<'date-time'>;
}

export interface AuditApiDocumentPartSnapshotEntity<
  T extends AnyObject = AnyObject,
> {
  part: T;
  partId: NonEmptyString;
  path: NonEmptyString;
}

export interface ApiDocumentCreateDto
  extends Omit<
    AuditApiDocumentPrimitiveEntity,
    'createdAt' | 'id' | 'versionDate'
  > {
  parts?: AuditApiDocumentPartSnapshotEntity[] | undefined;
  versionDate: string & tags.Format<'date-time'>;
}
