import BigNumber from 'bignumber.js';

import { sumBigNumbers } from './math.helpers';

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
});
