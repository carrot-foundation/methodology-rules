import { getUTCDatePart } from './project-period.helpers';

describe('getUTCDatePart', () => {
  it('should return the UTC date part of the given date', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const result = getUTCDatePart(date);

    expect(result).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should preserve hours, minutes, and seconds in UTC', () => {
    const date = new Date('2024-01-01T12:34:56Z');
    const result = getUTCDatePart(date);

    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(34);
    expect(result.getUTCSeconds()).toBe(56);
  });

  it('should handle non-UTC input correctly', () => {
    const date = new Date('2024-01-01T12:00:00-05:00');
    const result = getUTCDatePart(date);

    expect(result.getUTCHours()).toBe(17);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it('should handle BRT timezone (UTC-3) correctly', () => {
    const date = new Date('2024-01-01T00:00:00-03:00');
    const result = getUTCDatePart(date);

    expect(result.getUTCHours()).toBe(3);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it('should handle date objects created with local timezone', () => {
    const localDate = new Date(2024, 0, 1, 12, 0, 0);

    const localOffset = localDate.getTimezoneOffset();
    const expectedUTCHours = (12 + localOffset / 60) % 24;

    const result = getUTCDatePart(localDate);

    expect(result.getUTCHours()).toBe(expectedUTCHours);
  });

  it('should handle dates at day boundaries', () => {
    const endOfDay = new Date('2024-01-01T23:59:59Z');
    const resultEndOfDay = getUTCDatePart(endOfDay);

    expect(resultEndOfDay.getUTCDate()).toBe(1);
    expect(resultEndOfDay.getUTCHours()).toBe(23);
    expect(resultEndOfDay.getUTCMinutes()).toBe(59);
    expect(resultEndOfDay.getUTCSeconds()).toBe(59);

    const startOfDay = new Date('2024-01-01T00:00:00Z');
    const resultStartOfDay = getUTCDatePart(startOfDay);

    expect(resultStartOfDay.getUTCDate()).toBe(1);
    expect(resultStartOfDay.getUTCHours()).toBe(0);
    expect(resultStartOfDay.getUTCMinutes()).toBe(0);
    expect(resultStartOfDay.getUTCSeconds()).toBe(0);
  });

  it('should handle dates during DST transitions', () => {
    const daylightSavingTimeTransition = new Date('2024-03-10T07:30:00Z');
    const resultDST = getUTCDatePart(daylightSavingTimeTransition);

    expect(resultDST.getUTCHours()).toBe(7);
    expect(resultDST.getUTCMinutes()).toBe(30);
  });

  it('should handle leap year dates', () => {
    const leapYearDate = new Date('2024-02-29T12:00:00Z');
    const result = getUTCDatePart(leapYearDate);

    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(29);
  });

  it('should handle milliseconds correctly', () => {
    const dateWithMs = new Date('2024-01-01T12:34:56.789Z');
    const result = getUTCDatePart(dateWithMs);

    expect(result.getUTCMilliseconds()).toBe(0);
  });
});
