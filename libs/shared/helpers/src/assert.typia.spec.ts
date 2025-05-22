import { TypeGuardError } from 'typia';

import { assertNonEmptyString } from './assert.typia';

describe('assertNonEmptyString', () => {
  it('should return the string if it is non-empty', () => {
    expect(assertNonEmptyString('hello')).toBe('hello');
    expect(assertNonEmptyString('a')).toBe('a');
    expect(assertNonEmptyString('  space  ')).toBe('  space  ');
  });

  it('should throw TypeGuardError for empty string', () => {
    expect(() => assertNonEmptyString('')).toThrow(TypeGuardError);
  });

  it('should throw TypeGuardError for non-string values', () => {
    const invalidValues = [null, undefined, 123, {}, [], true, false];

    for (const value of invalidValues) {
      expect(() => assertNonEmptyString(value)).toThrow(TypeGuardError);
    }
  });
});
