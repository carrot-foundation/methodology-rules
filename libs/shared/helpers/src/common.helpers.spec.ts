import { faker } from '@faker-js/faker';

import { isNil, pick } from './common.helpers';

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
