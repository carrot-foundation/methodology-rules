import { isNonEmptyArray } from './array.helpers';

describe('ArrayHelpers', () => {
  describe('isNonEmptyArray', () => {
    it.each([
      { expected: false, input: [] },
      { expected: true, input: [1] },
      { expected: true, input: [1, 2, 3] },
      { expected: true, input: ['a', 'b', 'c'] },
      { expected: true, input: [true, false, true] },
      { expected: true, input: [null, undefined, null] },
      { expected: false, input: {} },
      { expected: false, input: 'string' },
      { expected: false, input: 1 },
      { expected: false, input: true },
      { expected: false, input: null },
      { expected: false, input: undefined },
    ])('should return %s for %s', ({ expected, input }) => {
      expect(isNonEmptyArray(input)).toEqual(expected);
    });
  });
});
