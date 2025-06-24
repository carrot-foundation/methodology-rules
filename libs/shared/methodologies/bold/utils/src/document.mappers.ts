import { pick } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const mapDocumentRelation = (document: Document): DocumentRelation => ({
  ...pick(document, 'category', 'subtype', 'type'),
  documentId: document.id,
});
