import type { AnyObject } from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

export interface DocumentKeyDto {
  key: string;
}

export type DocumentEntity<T extends AnyObject = AnyObject> = {
  createdAt: string & tags.Format<'date-time'>;
  document: T;
  id: string & tags.Format<'uuid'>;
  versionDate: string & tags.Format<'date-time'>;
};
