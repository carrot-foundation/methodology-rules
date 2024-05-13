import { stubEnumValue } from '../enum.stubs';

describe('enum stubs', () => {
  describe('stubEnumValue', () => {
    it('should return a random enum value', () => {
      enum EnumValues {
        A = 'A',
        B = 'B',
        C = 'C',
      }

      const result = stubEnumValue(EnumValues);

      expect(Object.values(EnumValues)).toContain(result);
    });
  });
});
