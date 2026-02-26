import { parseConfig } from './config-parser';

describe('parseConfig', () => {
  it('should return undefined when configString is undefined', () => {
    expect(parseConfig(undefined)).toBeUndefined();
  });

  it('should parse valid JSON config string', () => {
    const result = parseConfig('{"key":"value"}');

    expect(result).toEqual({ key: 'value' });
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseConfig('not-json')).toThrow(
      'Invalid --config JSON: not-json',
    );
  });
});
