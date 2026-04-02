import { createStubFromSchema } from '@carrot-fndn/shared/testing';
import { DocumentEventAttachmentSchema } from '@carrot-fndn/shared/types';

import { BoldDocumentEventAttributeSchema } from './document-event.types';
import {
  BoldDocumentEventWithAttachmentsSchema,
  BoldDocumentEventWithMetadataSchema,
} from './validation.types';

describe('BoldDocumentEventWithAttachmentsSchema', () => {
  it.each([
    {
      expected: true,
      input: {
        attachments: [createStubFromSchema(DocumentEventAttachmentSchema)],
      },
      scenario: 'non-empty attachments',
    },
    {
      expected: false,
      input: { attachments: [] },
      scenario: 'empty attachments',
    },
  ])('should return $expected for $scenario', ({ expected, input }) => {
    expect(
      BoldDocumentEventWithAttachmentsSchema.safeParse(input).success,
    ).toBe(expected);
  });
});

describe('BoldDocumentEventWithMetadataSchema', () => {
  it.each([
    {
      expected: true,
      input: {
        metadata: {
          attributes: [createStubFromSchema(BoldDocumentEventAttributeSchema)],
        },
      },
      scenario: 'non-empty attributes',
    },
    {
      expected: false,
      input: { metadata: { attributes: [] } },
      scenario: 'empty attributes',
    },
  ])('should return $expected for $scenario', ({ expected, input }) => {
    expect(BoldDocumentEventWithMetadataSchema.safeParse(input).success).toBe(
      expected,
    );
  });
});
