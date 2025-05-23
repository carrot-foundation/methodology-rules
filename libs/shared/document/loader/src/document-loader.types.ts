import type { AnyObject, DateTime } from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

export type DocumentEntity<T extends AnyObject = AnyObject> = {
  createdAt: DateTime;
  document: T;
  id: string & tags.Format<'uuid'>;
  versionDate: DateTime;
};

export interface DocumentKeyDto {
  key: string;
}
