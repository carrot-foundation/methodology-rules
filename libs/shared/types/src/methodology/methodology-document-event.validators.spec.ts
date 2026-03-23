import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import { ApprovedExceptionSchema } from './methodology-document-event.types';
import { isApprovedExceptionAttributeValue } from './methodology-document-event.validators';

describe('isApprovedExceptionAttributeValue', () => {
  it('should return true for a valid approved exception array', () => {
    const valid = [createStubFromSchema(ApprovedExceptionSchema)];

    expect(isApprovedExceptionAttributeValue(valid)).toBe(true);
  });

  it('should return false for a non-array value', () => {
    expect(isApprovedExceptionAttributeValue('string')).toBe(false);
  });

  it('should return false for an object missing required fields', () => {
    expect(isApprovedExceptionAttributeValue([{ Reason: 'test' }])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isApprovedExceptionAttributeValue(null)).toBe(false);
  });
});
