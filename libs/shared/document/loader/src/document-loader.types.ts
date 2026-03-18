import type { AnyObject, DateTime } from '@carrot-fndn/shared/types';

export type DocumentEntity<T extends AnyObject = AnyObject> = {
  createdAt: DateTime;
  document: T;
  id: string;
  versionDate: DateTime;
};

export interface DocumentKeyDto {
  key: string;
}

export interface DocumentLoader {
  load(dto: DocumentKeyDto): Promise<DocumentEntity>;
}
