import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';

import { splitBigNumberIntoParts, sumBigNumbers } from './math.helpers';

describe('Math helpers', () => {
  describe('sumBigNumbers', () => {
    it('should return the sum of an array of BigNumbers', () => {
      const values = [new BigNumber(10), new BigNumber(20), new BigNumber(30)];
      const result = sumBigNumbers(values);

      expect(result.toString()).toBe('60');
    });

    it('should return 0 if the array is empty', () => {
      const values: BigNumber[] = [];
      const result = sumBigNumbers(values);

      expect(result.toString()).toBe('0');
    });

    it('should return the value itself if the array contains only one element', () => {
      const values = [new BigNumber(100)];
      const result = sumBigNumbers(values);

      expect(result.toString()).toBe('100');
    });

    it('should handle negative numbers correctly', () => {
      const values = [new BigNumber(-10), new BigNumber(5), new BigNumber(-3)];
      const result = sumBigNumbers(values);

      expect(result.toString()).toBe('-8');
    });
  });

  describe('splitBigNumberIntoParts', () => {
    it('should return an array of BigNumbers with the correct sum', () => {
      const decimals = faker.number.int({ max: 8, min: 3 });
      const total = BigNumber(Math.random()).times(150).decimalPlaces(decimals);
      const partsCount = faker.number.int({ max: 8, min: 3 });
      const parts = splitBigNumberIntoParts(total, partsCount);

      expect(parts.length).toBe(partsCount);
      expect(sumBigNumbers(parts).toString()).toBe(total.toString());

      for (const part of parts) {
        expect(part.decimalPlaces()).toBeLessThanOrEqual(decimals);
      }
    });

    it('should handle NaN correctly', () => {
      const partsCount = faker.number.int({ max: 3, min: 1 });
      const parts = splitBigNumberIntoParts(
        new BigNumber(Number.NaN),
        partsCount,
      );

      expect(parts.length).toBe(partsCount);

      for (const part of parts) {
        expect(part.toString()).toBe('NaN');
      }
    });
  });
});
