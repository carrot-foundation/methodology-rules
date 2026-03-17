import { z } from 'zod';

import { assertNonEmptyString } from './assert.validators';

describe('assertNonEmptyString', () => {
  it('should return the string if it is non-empty', () => {
    expect(assertNonEmptyString('hello')).toBe('hello');
    expect(assertNonEmptyString('a')).toBe('a');
    expect(assertNonEmptyString('  space  ')).toBe('  space  ');
  });

  it('should throw ZodError for empty string', () => {
    expect(() => assertNonEmptyString('')).toThrow(z.ZodError);
  });

  it('should throw ZodError for non-string values', () => {
    const invalidValues = [null, undefined, 123, {}, [], true, false];

    for (const value of invalidValues) {
      expect(() => assertNonEmptyString(value)).toThrow(z.ZodError);
    }
  });
});
