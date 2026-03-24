import { pick } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentRelation,
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
  category: 'MassID',
});

export const MASS_ID_AUDIT = new DocumentMatcher({
  category: 'Methodology',
  type: 'MassID Audit',
});

export const RECYCLED_ID = new DocumentMatcher({
  category: 'Methodology',
  type: 'RecycledID',
});

export const GAS_ID = new DocumentMatcher({
  category: 'Methodology',
  type: 'GasID',
});

export const METHODOLOGY_DEFINITION = new DocumentMatcher({
  category: 'Methodology',
  type: 'Definition',
});

export const PARTICIPANT_ACCREDITATION_GROUP = new DocumentMatcher({
  category: 'Methodology',
  subtype: 'Group',
  type: 'Participant Accreditation',
});

export const PARTICIPANT_ACCREDITATION_PARTIAL_MATCH = new DocumentMatcher({
  category: 'Methodology',
  type: 'Participant Accreditation',
});

export const CREDIT_ORDER_MATCH = new DocumentMatcher({
  category: 'Methodology',
  type: 'Credit Order',
});
