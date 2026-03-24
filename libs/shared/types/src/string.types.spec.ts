import { BigNumberStringSchema, PercentageStringSchema } from './string.types';

describe('BigNumberStringSchema', () => {
  it.each(['123.456', '0', '-99.5', '1e5', '0.001', '999999999999999'])(
    'should accept valid BigNumber string: %s',
    (value) => {
      expect(BigNumberStringSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ['empty string', ''],
    ['non-numeric text', 'not-a-number'],
    ['Infinity', 'Infinity'],
    ['NaN', 'NaN'],
    ['-Infinity', '-Infinity'],
  ])('should reject invalid BigNumber string: %s', (_label, value) => {
    expect(BigNumberStringSchema.safeParse(value).success).toBe(false);
  });

  it('should reject non-string types', () => {
    expect(BigNumberStringSchema.safeParse(123).success).toBe(false);
    expect(BigNumberStringSchema.safeParse(null).success).toBe(false);
    expect(BigNumberStringSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('PercentageStringSchema', () => {
  it.each(['0', '1', '0.5', '0.123', '1.0', '1.000'])(
    'should accept valid percentage string: %s',
    (value) => {
      expect(PercentageStringSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ['empty string', ''],
    ['negative', '-0.5'],
    ['greater than 1', '1.1'],
    ['text', 'abc'],
  ])('should reject invalid percentage string: %s', (_label, value) => {
    expect(PercentageStringSchema.safeParse(value).success).toBe(false);
  });
});
