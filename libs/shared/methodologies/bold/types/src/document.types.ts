import type { MethodologyDocument } from '@carrot-fndn/shared/types';

import type { DocumentEvent } from './document-event.types';
import type {
  DocumentCategory,
  DocumentSubtype,
  DocumentType,
  MassIdSubtype,
} from './enum.types';

export interface Document extends MethodologyDocument {
  category: DocumentCategory | string;
  externalEvents?: DocumentEvent[] | undefined;
  subtype?: DocumentSubtype | MassIdSubtype | string | undefined;
  type?: DocumentType | string | undefined;
}
