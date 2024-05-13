import {
  type Document,
  type DocumentReference,
} from '@carrot-fndn/methodologies/bold/types';
import { pick } from '@carrot-fndn/shared/helpers';

export const mapDocumentReference = (
  document: Document,
): DocumentReference => ({
  ...pick(document, 'category', 'subtype', 'type'),
  documentId: document.id,
});
