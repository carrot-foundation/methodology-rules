import { arrayOfUniqueValues, isNonEmptyArray } from './array.helpers';

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

  describe('arrayOfUniqueValues', () => {
    it.each([
      { expected: [], input: [] },
      { expected: [1], input: [1] },
      { expected: [1], input: [1, 1, 1, 1] },
      { expected: [1, 2], input: [1, 2, 1, 2] },
    ])('should return $expected for $input', ({ expected, input }) => {
      expect(arrayOfUniqueValues(input)).toEqual(expected);
    });

    it.each([
      { expected: ['a'], input: ['a', 'a', 'a'] },
      { expected: ['1', '2'], input: ['1', '2', '1', '2'] },
    ])('should return $expected for $input', ({ expected, input }) => {
      expect(arrayOfUniqueValues(input)).toEqual(expected);
    });
  });
});
