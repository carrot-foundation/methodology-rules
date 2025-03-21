import { pick } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface DocumentMatch {
  category?: Document['category'] | undefined;
  subtype?: Document['subtype'];
  type?: Document['type'];
}

export class DocumentMatcher {
  constructor(readonly match: DocumentMatch) {}

  matches(document: Omit<DocumentReference, 'id'>): boolean {
    const matchKeys = Object.keys(this.match) as Array<keyof DocumentMatch>;

    const objectToMatch = pick(document, ...matchKeys);

    // eslint-disable-next-line security/detect-object-injection
    return matchKeys.every((key) => this.match[key] === objectToMatch[key]);
  }
}

export const MASS = new DocumentMatcher({
  category: DocumentCategory.MASS,
});

export const MASS_ID = new DocumentMatcher({
  category: DocumentCategory.MASS_ID,
});

export const MASS_AUDIT = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_AUDIT,
});

export const MASS_ID_AUDIT = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_ID_AUDIT,
});

export const RECYCLED_ID = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.RECYCLED_ID,
});

export const MASS_CERTIFICATE = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  type: DocumentType.MASS_CERTIFICATE,
});

export const MASS_CERTIFICATE_AUDIT = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.PROCESS,
  type: DocumentType.MASS_CERTIFICATE_AUDIT,
});

export const CREDIT_CERTIFICATES = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.GROUP,
  type: DocumentType.CREDIT_CERTIFICATES,
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

export const TRC_CREDIT_MATCH = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.TRC,
  type: DocumentType.CREDIT,
});

export const TCC_CREDIT_MATCH = new DocumentMatcher({
  category: DocumentCategory.METHODOLOGY,
  subtype: DocumentSubtype.TCC,
  type: DocumentType.CREDIT,
});
