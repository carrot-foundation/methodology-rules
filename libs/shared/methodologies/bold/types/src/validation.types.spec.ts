import {
  DocumentEventWithAttachmentsSchema,
  DocumentEventWithMetadataSchema,
} from './validation.types';

describe('DocumentEventWithAttachmentsSchema', () => {
  it('should reject empty attachments array', () => {
    expect(
      DocumentEventWithAttachmentsSchema.safeParse({ attachments: [] }).success,
    ).toBe(false);
  });
});

describe('DocumentEventWithMetadataSchema', () => {
  it('should reject empty attributes array', () => {
    expect(
      DocumentEventWithMetadataSchema.safeParse({
        metadata: { attributes: [] },
      }).success,
    ).toBe(false);
  });
});
