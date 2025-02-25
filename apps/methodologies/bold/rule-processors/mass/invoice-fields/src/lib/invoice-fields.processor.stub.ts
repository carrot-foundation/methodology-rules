import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
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
