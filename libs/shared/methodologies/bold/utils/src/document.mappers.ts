import { pick } from '@carrot-fndn/shared/helpers';
import {
  type BoldDocument,
  type BoldDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const mapDocumentRelation = (
  document: BoldDocument,
): BoldDocumentRelation => ({
  ...pick(document, 'category', 'subtype', 'type'),
  documentId: document.id,
});
