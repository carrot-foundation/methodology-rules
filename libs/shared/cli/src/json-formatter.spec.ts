import { formatAsJson } from './json-formatter';

describe('formatAsJson', () => {
  it('should format an object as indented JSON', () => {
    const result = formatAsJson({ a: 1, b: 'two' });

    expect(result).toBe(JSON.stringify({ a: 1, b: 'two' }, undefined, 2));
  });

  it('should format an array as indented JSON', () => {
    const result = formatAsJson([1, 2, 3]);

    expect(result).toBe(JSON.stringify([1, 2, 3], undefined, 2));
  });

  it('should handle null and primitive values', () => {
    expect(formatAsJson(null)).toBe('null');
    expect(formatAsJson(42)).toBe('42');
    expect(formatAsJson('hello')).toBe('"hello"');
  });
});
