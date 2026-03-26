import { describe, expect, it } from 'vitest';

import { diffMethodologyFrameworkRules } from './methodology-framework-rules-diff';

describe('diffMethodologyFrameworkRules', () => {
  it.each([
    {
      current: ['rule-a', 'rule-b', 'rule-c'],
      expected: { added: ['rule-c'], removed: [] },
      name: 'added rules',
      previous: ['rule-a', 'rule-b'],
    },
    {
      current: ['rule-a', 'rule-b'],
      expected: { added: [], removed: ['rule-c'] },
      name: 'removed rules',
      previous: ['rule-a', 'rule-b', 'rule-c'],
    },
    {
      current: ['rule-a', 'rule-c'],
      expected: { added: ['rule-c'], removed: ['rule-b'] },
      name: 'added and removed rules',
      previous: ['rule-a', 'rule-b'],
    },
    {
      current: ['rule-a', 'rule-b'],
      expected: { added: [], removed: [] },
      name: 'no changes',
      previous: ['rule-a', 'rule-b'],
    },
    {
      current: ['rule-a'],
      expected: { added: ['rule-a'], removed: [] },
      name: 'empty previous array',
      previous: [] as string[],
    },
    {
      current: [] as string[],
      expected: { added: [], removed: ['rule-a'] },
      name: 'empty current array',
      previous: ['rule-a'],
    },
  ])('should correctly diff rule sets ($name)', ({ previous, current, expected }) => {
    expect(diffMethodologyFrameworkRules(previous, current)).toEqual(expected);
  });
});
