import { isApprovedExceptionAttributeValue } from './methodology-document-event.validators';

describe('isApprovedExceptionAttributeValue', () => {
  it('should return true for a valid approved exception array', () => {
    const valid = [
      {
        'Attribute Location': {
          Asset: { Category: 'MassID' },
          Event: 'Weighing',
        },
        'Attribute Name': 'Vehicle License Plate',
        'Exception Type': 'Exemption for Mandatory Attribute',
        Reason: 'Vehicle does not have a license plate',
      },
    ];

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
