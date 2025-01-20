import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { type DocumentEvent } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
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
    name: MethodologyDocumentEventName.MOVE,
  });
