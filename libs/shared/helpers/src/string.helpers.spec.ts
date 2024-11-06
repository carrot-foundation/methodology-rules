import {
  extractNumberFromString,
  getNonEmptyString,
  isNonEmptyString,
} from './string.helpers';

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

  describe('extractNumberFromString', () => {
    it('should return the number from the string without measurement unit', () => {
      expect(extractNumberFromString('123')).toBe(123);
      expect(extractNumberFromString('123.456')).toBe(123.456);
      expect(extractNumberFromString('123,456')).toBe(123_456);
    });

    it('should return the number from the string with measurement unit', () => {
      expect(extractNumberFromString('123 kg')).toBe(123);
      expect(extractNumberFromString('123.456 kg')).toBe(123.456);
      expect(extractNumberFromString('123,456 kg')).toBe(123_456);
    });

    it('should throw an error if the string is not a number', () => {
      expect(() => extractNumberFromString('test')).toThrow(
        'Could not extract number from test',
      );
    });
  });
});
