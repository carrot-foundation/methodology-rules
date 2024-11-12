import { stubBigNumber } from '../number.stubs';

describe('stubBigNumber', () => {
  it('should return a big number with the default values', () => {
    const max = 100;
    const decimals = 6;

    for (let index = 0; index < 20; index += 1) {
      const result = stubBigNumber();

      expect(result.toNumber()).toBeGreaterThan(0);
      expect(result.toNumber()).toBeLessThanOrEqual(max);
      expect(result.decimalPlaces()).toBeLessThanOrEqual(decimals);
    }
  });

  it('should override the default values', () => {
    const decimals = 2;
    const max = 20;
    const result = stubBigNumber({ decimals, max });

    expect(result.toNumber()).toBeGreaterThan(0);
    expect(result.toNumber()).toBeLessThanOrEqual(max);
    expect(result.decimalPlaces()).toBeLessThanOrEqual(decimals);
  });
});
