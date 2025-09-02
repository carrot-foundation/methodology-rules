import { faker } from '@faker-js/faker';

import {
  getNonEmptyStringOrDefault,
  getOrDefault,
  getOrUndefined,
  isNil,
  isNonEmptyObject,
  isObject,
  isPlainObject,
  pick,
} from './common.helpers';

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

  describe('getNonEmptyStringOrDefault', () => {
    const defaultValue = 'default-value';

    it('should return defaultValue for null input', () => {
      expect(getNonEmptyStringOrDefault(null, defaultValue)).toBe(defaultValue);
    });

    it('should return defaultValue for undefined input', () => {
      expect(getNonEmptyStringOrDefault(undefined, defaultValue)).toBe(
        defaultValue,
      );
    });

    it('should return defaultValue for empty string input', () => {
      expect(getNonEmptyStringOrDefault('', defaultValue)).toBe(defaultValue);
    });

    it('should return defaultValue for whitespace-only string', () => {
      expect(getNonEmptyStringOrDefault('   ', defaultValue)).toBe(
        defaultValue,
      );
    });

    it('should return defaultValue for mixed whitespace string', () => {
      expect(getNonEmptyStringOrDefault('  \t\n\r  ', defaultValue)).toBe(
        defaultValue,
      );
    });

    it('should return trimmed value for string with leading whitespace', () => {
      expect(getNonEmptyStringOrDefault('  hello', defaultValue)).toBe('hello');
    });

    it('should return trimmed value for string with trailing whitespace', () => {
      expect(getNonEmptyStringOrDefault('hello  ', defaultValue)).toBe('hello');
    });

    it('should return trimmed value for string with both leading and trailing whitespace', () => {
      expect(getNonEmptyStringOrDefault('  hello  ', defaultValue)).toBe(
        'hello',
      );
    });

    it('should return original value for string without whitespace', () => {
      expect(getNonEmptyStringOrDefault('hello', defaultValue)).toBe('hello');
    });

    it('should handle very long whitespace strings', () => {
      const longWhitespace = ' '.repeat(1000);

      expect(getNonEmptyStringOrDefault(longWhitespace, defaultValue)).toBe(
        defaultValue,
      );
    });

    it('should handle normal strings with various whitespace characters', () => {
      expect(getNonEmptyStringOrDefault('\thello\nworld\r', defaultValue)).toBe(
        'hello\nworld',
      );
    });
  });

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);

      // Test Object.create(null) - This is for the proto === null case
      const objectWithNullProto: Record<string, string> = Object.create(null);

      objectWithNullProto['test'] = 'value';
      expect(isPlainObject(objectWithNullProto)).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);

      // Mock an object with a different constructor string
      class CustomClass {}
      expect(isPlainObject(new CustomClass())).toBe(false);
    });
  });

  describe('isNonEmptyObject', () => {
    it('should return true for non-empty objects', () => {
      expect(isNonEmptyObject({ key: 'value' })).toBe(true);
    });

    it('should return false for empty objects', () => {
      expect(isNonEmptyObject({})).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isNonEmptyObject(null)).toBe(false);
      expect(isNonEmptyObject(undefined)).toBe(false);
      expect(isNonEmptyObject('string')).toBe(false);
      expect(isNonEmptyObject(123)).toBe(false);
    });
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

    it('should handle empty keys array', () => {
      const object = {
        valueA: faker.string.sample(),
        valueB: faker.string.sample(),
      };

      const pickedObject = pick(object);

      expect(pickedObject).toEqual({});
    });
  });
});
