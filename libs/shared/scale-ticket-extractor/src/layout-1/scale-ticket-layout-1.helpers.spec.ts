import { parseDate, parseNumber } from './scale-ticket-layout-1.helpers';

describe('layout-1 helpers', () => {
  describe('parseNumber', () => {
    it.each([
      ['123', 123],
      ['1.234', 1234],
      ['1.234,56', 1234.56],
      ['0,5', 0.5],
    ])('should parse "%s" as %d', (input, expected) => {
      expect(parseNumber(input)).toBeCloseTo(expected);
    });

    it.each(['', 'abc'])(
      'should return undefined for invalid number "%s"',
      (input) => {
        expect(parseNumber(input)).toBeUndefined();
      },
    );
  });

  describe('parseDate', () => {
    it('should parse valid date and time', () => {
      const result = parseDate('01/02/2023', '03:04');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2023);
      expect(result?.getMonth()).toBe(1); // zero-based
      expect(result?.getDate()).toBe(1);
      expect(result?.getHours()).toBe(3);
      expect(result?.getMinutes()).toBe(4);
    });

    it.each([
      ['01-02-2023', '03:04'], // wrong date separator
      ['01/02', '03:04'], // incomplete date
      ['01/02/2023', '03'], // incomplete time
      ['aa/bb/cccc', '03:04'], // NaN date parts
    ])(
      'should return undefined for invalid date/time "%s" "%s"',
      (date, time) => {
        expect(parseDate(date, time)).toBeUndefined();
      },
    );
  });
});
