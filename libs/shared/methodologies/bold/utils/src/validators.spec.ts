import { validateNonEmptyString } from './validators';

describe('validateNonEmptyString', () => {
  it('should succeed for a valid non-empty string', () => {
    const result = validateNonEmptyString('hello');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('should fail for an empty string', () => {
    const result = validateNonEmptyString('');

    expect(result.success).toBe(false);
  });

  it('should fail for undefined', () => {
    const result = validateNonEmptyString(undefined);

    expect(result.success).toBe(false);
  });

  it('should fail for null', () => {
    const result = validateNonEmptyString(null);

    expect(result.success).toBe(false);
  });

  it('should fail for a number', () => {
    const result = validateNonEmptyString(42);

    expect(result.success).toBe(false);
  });

  it('should fail for an object', () => {
    const result = validateNonEmptyString({});

    expect(result.success).toBe(false);
  });
});
