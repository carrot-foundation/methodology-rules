import {
  isBigNumber,
  isNonZeroPositive,
  isNonZeroPositiveInt,
  isNumber,
  isUri,
  isValidLicensePlate,
} from './is.typia';

describe('is.typia', () => {
  describe('isValidLicensePlate', () => {
    describe('valid formats', () => {
      it.each([
        'ABC1D23',
        'XYZ9A01',
        'DEF5G78',
        'ABC-1234',
        'ABC 1234',
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

  describe('isNonZeroPositive', () => {
    describe('valid values', () => {
      it.each([0.1, 1, 1.5, 100, Number.MAX_SAFE_INTEGER])(
        'should validate %s as true',
        (input) => {
          expect(isNonZeroPositive(input)).toBeTruthy();
        },
      );
    });

    describe('invalid values', () => {
      it.each([
        0,
        -1,
        -0.1,
        Number.NaN,
        null,
        undefined,
        '',
        'abc',
        [],
        {},
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ])('should validate %s as false', (input) => {
        expect(isNonZeroPositive(input)).toBeFalsy();
      });
    });
  });

  describe('isNonZeroPositiveInt', () => {
    describe('valid values', () => {
      it.each([1, 2, 10, 100, Number.MAX_SAFE_INTEGER])(
        'should validate %s as true',
        (input) => {
          expect(isNonZeroPositiveInt(input)).toBeTruthy();
        },
      );
    });

    describe('invalid values', () => {
      it.each([
        0,
        -1,
        0.1,
        1.5,
        -0.1,
        Number.NaN,
        null,
        undefined,
        '',
        'abc',
        [],
        {},
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ])('should validate %s as false', (input) => {
        expect(isNonZeroPositiveInt(input)).toBeFalsy();
      });
    });
  });

  describe('isNumber', () => {
    describe('valid values', () => {
      it.each([
        0,
        1,
        -1,
        0.1,
        -0.1,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ])('should validate %s as true', (input) => {
        expect(isNumber(input)).toBeTruthy();
      });
    });

    describe('invalid values', () => {
      it.each([null, undefined, '', 'abc', '123', [], {}])(
        'should validate %s as false',
        (input) => {
          expect(isNumber(input)).toBeFalsy();
        },
      );
    });
  });

  describe('isUri', () => {
    describe('valid values', () => {
      it.each([
        'http://example.com',
        'https://example.com',
        'ftp://example.com',
        'http://localhost',
        'http://127.0.0.1',
        'http://example.com/path',
        'http://example.com/path?query=value',
        'http://example.com:8080',
        'http:/example.com',
        'http://',
      ])('should validate %s as true', (input) => {
        expect(isUri(input)).toBeTruthy();
      });
    });

    describe('invalid values', () => {
      it.each([
        '',
        null,
        undefined,
        'example.com',
        'http//example.com',
        'http:',
        'http',
        123,
        {},
        [],
      ])('should validate %s as false', (input) => {
        expect(isUri(input)).toBeFalsy();
      });
    });
  });

  describe('isBigNumber', () => {
    describe('expected behavior', () => {
      it('validates most values as true', () => {
        const validBigNumberValues = [
          { isEqualTo: () => true, toString: () => '123' } as any,
          { isEqualTo: () => true, toString: () => '0' } as any,
          { isEqualTo: () => true, toString: () => '-123' } as any,
          null,
          undefined,
          '',
          'abc',
          123,
          {} as any,
          [] as any,
          { toString: 'not a function' } as any,
          { isEqualTo: 'not a function' } as any,
          { toString: () => '123' } as any,
          { isEqualTo: () => true } as any,
        ];

        for (const input of validBigNumberValues) {
          expect(isBigNumber(input)).toBeTruthy();
        }
      });
    });
  });
});
