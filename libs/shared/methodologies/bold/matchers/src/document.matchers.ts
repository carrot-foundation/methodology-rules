import { pick } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  type DocumentRelation,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface DocumentMatch {
  category?: Document['category'] | undefined;
  subtype?: Document['subtype'];
  type?: Document['type'];
}

export class DocumentMatcher {
  readonly match: DocumentMatch;

  constructor(match: DocumentMatch) {
    this.match = match;
  }

  matches(document: Omit<DocumentRelation, 'id'>): boolean {
    const matchKeys = Object.keys(this.match) as Array<keyof DocumentMatch>;

    const objectToMatch = pick(document, ...matchKeys);

    // eslint-disable-next-line security/detect-object-injection
    return matchKeys.every((key) => this.match[key] === objectToMatch[key]);
  }
}

export const MASS_ID = new DocumentMatcher({
  category: DocumentCategory.MASS_ID,
});

export const MASS_ID_AUDIT = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_ID_AUDIT,
});

export const RECYCLED_ID = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.RECYCLED_ID,
});

export const GAS_ID = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.GAS_ID,
});

export const METHODOLOGY_DEFINITION = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.DEFINITION,
});

export const PARTICIPANT_HOMOLOGATION_GROUP = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.GROUP,
  type: DocumentType.PARTICIPANT_HOMOLOGATION,
});

export const PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.PARTICIPANT_HOMOLOGATION,
});

export const CREDIT_ORDER_MATCH = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.CREDIT_ORDER,
});
