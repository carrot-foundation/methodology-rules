import {
  DocumentQueryCriteriaSchema,
  RELATED_DOCUMENT_CRITERIA,
  ROOT_DOCUMENT_CRITERIA,
} from './document-query.criteria';

describe('DocumentQueryCriteriaSchema', () => {
  it('should accept the shared related-document criteria', () => {
    expect(
      DocumentQueryCriteriaSchema.parse(RELATED_DOCUMENT_CRITERIA),
    ).toEqual(RELATED_DOCUMENT_CRITERIA);
  });

  it('should accept the explicit root-only criteria', () => {
    expect(DocumentQueryCriteriaSchema.parse(ROOT_DOCUMENT_CRITERIA)).toEqual(
      ROOT_DOCUMENT_CRITERIA,
    );
  });

  it('should accept recursive non-empty document field values outside BOLD enums', () => {
    expect(
      DocumentQueryCriteriaSchema.safeParse({
        parentDocument: {
          category: 'Custom parent category',
          relatedDocuments: [
            {
              subtype: 'Custom nested subtype',
              type: 'Custom nested type',
            },
          ],
        },
        relatedDocuments: [
          {
            category: 'Custom related category',
            subtype: 'Custom related subtype',
            type: 'Custom related type',
          },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    [],
    { unknown: 'value' },
    { parentDocument: { omit: 'true' } },
    { relatedDocuments: [{ category: 42 }] },
    { parentDocument: { relatedDocuments: [{ type: 42 }] } },
  ])('should reject invalid criteria %j', (criteria) => {
    expect(DocumentQueryCriteriaSchema.safeParse(criteria).success).toBe(false);
  });
});
