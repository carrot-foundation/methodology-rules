import {
  BoldDocumentEventWithAttachmentsSchema,
  BoldDocumentEventWithMetadataSchema,
} from './validation.types';

describe('BoldDocumentEventWithAttachmentsSchema', () => {
  it('should reject empty attachments array', () => {
    expect(
      BoldDocumentEventWithAttachmentsSchema.safeParse({ attachments: [] })
        .success,
    ).toBe(false);
  });
});

describe('BoldDocumentEventWithMetadataSchema', () => {
  it('should reject empty attributes array', () => {
    expect(
      BoldDocumentEventWithMetadataSchema.safeParse({
        metadata: { attributes: [] },
      }).success,
    ).toBe(false);
  });
});
