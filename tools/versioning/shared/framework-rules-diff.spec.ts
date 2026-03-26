import { describe, expect, it } from 'vitest';

import { diffFrameworkRules } from './framework-rules-diff';

describe('diffFrameworkRules', () => {
  it('should detect added rules', () => {
    const previous = ['rule-a', 'rule-b'];
    const current = ['rule-a', 'rule-b', 'rule-c'];
    const result = diffFrameworkRules(previous, current);

    expect(result).toEqual({ added: ['rule-c'], removed: [] });
  });

  it('should detect removed rules', () => {
    const previous = ['rule-a', 'rule-b', 'rule-c'];
    const current = ['rule-a', 'rule-b'];
    const result = diffFrameworkRules(previous, current);

    expect(result).toEqual({ added: [], removed: ['rule-c'] });
  });

  it('should detect both added and removed', () => {
    const previous = ['rule-a', 'rule-b'];
    const current = ['rule-a', 'rule-c'];
    const result = diffFrameworkRules(previous, current);

    expect(result).toEqual({ added: ['rule-c'], removed: ['rule-b'] });
  });

  it('should return empty arrays when no changes', () => {
    const rules = ['rule-a', 'rule-b'];
    const result = diffFrameworkRules(rules, rules);

    expect(result).toEqual({ added: [], removed: [] });
  });

  it('should handle empty arrays', () => {
    expect(diffFrameworkRules([], ['rule-a'])).toEqual({
      added: ['rule-a'],
      removed: [],
    });
    expect(diffFrameworkRules(['rule-a'], [])).toEqual({
      added: [],
      removed: ['rule-a'],
    });
  });
});
