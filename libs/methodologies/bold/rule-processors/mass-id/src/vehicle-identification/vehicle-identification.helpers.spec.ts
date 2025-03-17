import { validateLicensePlate } from './vehicle-identification.helpers';

describe('Helpers', () => {
  describe('validateLicensePlate', () => {
    describe('valid formats', () => {
      it.each([
        ['ABC1D23', true],
        ['XYZ9A01', true],
        ['DEF5G78', true],
        ['ABC-1234', true],
        ['XYZ-5678', true],
        ['DEF-9012', true],
        ['AB-1234', true],
        ['XY-5678', true],
        ['CD-9012', true],
      ])('should validate %s as %s', (input, expected) => {
        expect(validateLicensePlate(input)).toBe(expected);
      });
    });

    describe('invalid formats', () => {
      it.each([
        ['', false],
        [null, false],
        [undefined, false],
        ['abc1d23', false],
        ['abc-1234', false],
        ['ab-1234', false],
        ['AbC1D23', false],
        ['aBc-1234', false],
        ['Ab-1234', false],
        ['AB1C2', false],
        ['AB-123', false],
        ['A-1234', false],
        ['ABCD1E23', false],
        ['ABCD-1234', false],
        ['ABC-12345', false],
        ['A1C1D23', false],
        ['1BC1D23', false],
        ['ABCAD23', false],
        ['ABC1DAB', false],
        ['ABC-ABCD', false],
        ['AB-ABCD', false],
        ['ABC1234', false],
        ['AB1234', false],
        ['AB1-234', false],
        ['A-BC1234', false],
        ['ABCD-123', false],
        ['ABC.1234', false],
        ['ABC_1234', false],
        ['ABC 1234', false],
        ['AB.1234', false],
        [12_345, false],
        [{}, false],
        [[], false],
      ])('should validate %s as %s', (input, expected) => {
        expect(validateLicensePlate(input)).toBe(expected);
      });
    });
  });
});
