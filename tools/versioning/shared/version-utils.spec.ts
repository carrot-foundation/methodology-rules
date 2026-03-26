import { describe, expect, it } from 'vitest';

import { bumpVersion, highestBump } from './version-utils';

describe('bumpVersion', () => {
  it('should bump patch', () => {
    expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1');
  });

  it('should bump minor', () => {
    expect(bumpVersion('1.0.0', 'minor')).toBe('1.1.0');
  });

  it('should bump major', () => {
    expect(bumpVersion('1.0.0', 'major')).toBe('2.0.0');
  });

  it('should handle non-zero versions', () => {
    expect(bumpVersion('2.3.4', 'patch')).toBe('2.3.5');
    expect(bumpVersion('2.3.4', 'minor')).toBe('2.4.0');
    expect(bumpVersion('2.3.4', 'major')).toBe('3.0.0');
  });

  it('should throw on invalid version', () => {
    expect(() => bumpVersion('invalid', 'patch')).toThrow('Invalid version');
  });
});

describe('highestBump', () => {
  it('should return major when any bump is major', () => {
    expect(highestBump(['patch', 'minor', 'major'])).toBe('major');
  });

  it('should return minor when highest is minor', () => {
    expect(highestBump(['patch', 'minor'])).toBe('minor');
  });

  it('should return patch when all are patch', () => {
    expect(highestBump(['patch', 'patch'])).toBe('patch');
  });

  it('should return undefined for empty array', () => {
    expect(highestBump([])).toBeUndefined();
  });

  it('should handle single element', () => {
    expect(highestBump(['minor'])).toBe('minor');
  });
});
