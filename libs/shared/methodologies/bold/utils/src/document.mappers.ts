import { pick } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentReference,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const mapDocumentReference = (
  document: Document,
): DocumentReference => ({
  ...pick(document, 'category', 'subtype', 'type'),
  documentId: document.id,
});
