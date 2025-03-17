import { isValidLicensePlate } from './vehicle-identification.helpers';

describe('Vehicle Identification Helpers', () => {
  describe('validateLicensePlate', () => {
    describe('valid formats', () => {
      it.each([
        'ABC1D23',
        'XYZ9A01',
        'DEF5G78',
        'ABC-1234',
        'XYZ-5678',
        'DEF-9012',
        'AB-1234',
        'XY-5678',
        'CD-9012',
      ])('should validate %s as true', (input) => {
        expect(isValidLicensePlate(input)).toBeTruthy();
      });
    });

    describe('invalid formats', () => {
      it.each([
        '',
        null,
        undefined,
        'abc1d23',
        'abc-1234',
        'ab-1234',
        'AbC1D23',
        'aBc-1234',
        'Ab-1234',
        'AB1C2',
        'AB-123',
        'A-1234',
        'ABCD1E23',
        'ABCD-1234',
        'ABC-12345',
        'A1C1D23',
        '1BC1D23',
        'ABCAD23',
        'ABC1DAB',
        'ABC-ABCD',
        'AB-ABCD',
        'ABC1234',
        'AB1234',
        'AB1-234',
        'A-BC1234',
        'ABCD-123',
        'ABC.1234',
        'ABC_1234',
        'ABC 1234',
        'AB.1234',
        12_345,
        {},
        '***1***',
        '***-****',
        '**-****',
        '****1*23',
        '****-1234',
        '***-12345',
        [],
      ])('should validate %s as false', (input) => {
        expect(isValidLicensePlate(input)).toBeFalsy();
      });
    });
  });
});
