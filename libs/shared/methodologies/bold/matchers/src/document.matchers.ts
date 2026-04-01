import { pick } from '@carrot-fndn/shared/helpers';
import {
  type BoldDocument,
  BoldDocumentCategory,
  type BoldDocumentRelation,
  BoldDocumentSubtype,
  BoldDocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface DocumentMatch {
  category?: BoldDocument['category'] | undefined;
  subtype?: BoldDocument['subtype'];
  type?: BoldDocument['type'];
}

export class DocumentMatcher {
  readonly match: DocumentMatch;

  constructor(match: DocumentMatch) {
    this.match = match;
  }

  matches(document: Omit<BoldDocumentRelation, 'id'>): boolean {
    const matchKeys = Object.keys(this.match) as Array<keyof DocumentMatch>;

    const objectToMatch = pick(document, ...matchKeys);

    // eslint-disable-next-line security/detect-object-injection
    return matchKeys.every((key) => this.match[key] === objectToMatch[key]);
  }
}

export const MASS_ID = new DocumentMatcher({
  category: BoldDocumentCategory.MASS_ID,
});

export const MASS_ID_AUDIT = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.MASS_ID_AUDIT,
});

export const RECYCLED_ID = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.RECYCLED_ID,
});

export const GAS_ID = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.GAS_ID,
});

export const METHODOLOGY_DEFINITION = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.DEFINITION,
});

export const PARTICIPANT_ACCREDITATION_GROUP = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  subtype: BoldDocumentSubtype.GROUP,
  type: BoldDocumentType.PARTICIPANT_ACCREDITATION,
});

export const PARTICIPANT_ACCREDITATION_PARTIAL_MATCH = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.PARTICIPANT_ACCREDITATION,
});

export const CREDIT_ORDER_MATCH = new DocumentMatcher({
  category: BoldDocumentCategory.METHODOLOGY,
  type: BoldDocumentType.CREDIT_ORDER,
});
