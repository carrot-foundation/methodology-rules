import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { faker } from '@faker-js/faker';

import { INVOICE_ATTRIBUTES } from './invoice-fields.constants';

export const stubEventWithAllInvoiceFields = (
  partialEvent?: PartialDeep<DocumentEvent>,
): DocumentEvent =>
  stubDocumentEvent({
    ...partialEvent,
    metadata: {
      attributes: INVOICE_ATTRIBUTES.map((attribute) => ({
        isPublic: true,
        name: attribute,
        value: faker.string.sample(),
      })),
    },
    name: DocumentEventName.MOVE,
  });
