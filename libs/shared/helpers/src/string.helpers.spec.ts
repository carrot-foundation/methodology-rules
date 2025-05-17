import { getNonEmptyString, isNonEmptyString } from './string.helpers';

describe('string helpers', () => {
  describe('isNonEmptyString', () => {
    it('should return true if the value is a non empty string', () => {
      expect(isNonEmptyString('test')).toBe(true);
    });

    it('should return false if the value is an empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false if the value is not a string', () => {
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('getNonEmptyString', () => {
    it('should return value if the value is a non empty string', () => {
      expect(getNonEmptyString('test')).toEqual('test');
    });

    it('should return undefined if the value is an empty string', () => {
      expect(getNonEmptyString('')).toBe(undefined);
    });

    it('should return undefined if the value is not a string', () => {
      expect(getNonEmptyString(123)).toBe(undefined);
    });
  });
});
