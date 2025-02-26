import { faker } from '@faker-js/faker';

import { getOrDefault, getOrUndefined, isNil, pick } from './common.helpers';

describe('common helpers', () => {
  describe('isNil', () => {
    it('should return true if the value is null', () => {
      expect(isNil(null)).toBe(true);
    });

    it('should return true if the value is undefined', () => {
      expect(isNil(undefined)).toBe(true);
    });

    it('should return false if the value is not null or undefined', () => {
      expect(isNil(123)).toBe(false);
    });
  });

  describe('getOrDefault', () => {
    it.each([
      { expected: 'test', value: 'test' },
      { expected: 'defaultValue', value: undefined },
      { expected: 'defaultValue', value: null },
    ])(
      'should return $expected when value is $value',
      ({ expected, value }) => {
        const defaultValue = 'defaultValue';
        const result = getOrDefault(value, defaultValue);

        expect(result).toBe(expected);
      },
    );
  });

  describe('getOrUndefined', () => {
    it.each([
      { expected: 'test', value: 'test' },
      { expected: undefined, value: undefined },
      { expected: undefined, value: null },
    ])(
      'should return $expected when value is $value',
      ({ expected, value }) => {
        const result = getOrUndefined(value);

        expect(result).toBe(expected);
      },
    );
  });

  describe('pick', () => {
    it('should return an object with only the keys passed', () => {
      const object = {
        valueA: faker.string.sample(),
        valueB: faker.string.sample(),
        valueC: faker.string.sample(),
      };

      const pickedObject = pick(object, 'valueA', 'valueB');

      expect(pickedObject).toEqual({
        valueA: object.valueA,
        valueB: object.valueB,
      });
    });
  });
});
