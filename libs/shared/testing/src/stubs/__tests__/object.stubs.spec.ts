import { stubObject } from '../object.stubs';

describe('object stubs', () => {
  describe('stubObject', () => {
    it('should return an object', () => {
      const result = stubObject();

      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });
});
