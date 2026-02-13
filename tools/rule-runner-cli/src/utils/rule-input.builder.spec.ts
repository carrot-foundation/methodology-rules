import { buildRuleInput } from './rule-input.builder';

describe('buildRuleInput', () => {
  it('should build a RuleInput with all fields', () => {
    const result = buildRuleInput({
      documentId: 'doc-123',
      documentKeyPrefix: 'prefix/documents',
      parentDocumentId: 'parent-456',
    });

    expect(result.documentId).toBe('doc-123');
    expect(result.documentKeyPrefix).toBe('prefix/documents');
    expect(result.parentDocumentId).toBe('parent-456');
    expect(result.requestId).toBeDefined();
    expect(result.responseToken).toBe('cli-placeholder-token');
    expect(result.responseUrl).toBe('https://localhost/placeholder');
  });

  it('should generate unique requestIds', () => {
    const result1 = buildRuleInput({
      documentId: 'doc-1',
      documentKeyPrefix: 'prefix',
      parentDocumentId: 'parent-1',
    });
    const result2 = buildRuleInput({
      documentId: 'doc-2',
      documentKeyPrefix: 'prefix',
      parentDocumentId: 'parent-2',
    });

    expect(result1.requestId).not.toBe(result2.requestId);
  });
});
