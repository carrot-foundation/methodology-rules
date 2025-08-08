import { type DocumentEventAttribute } from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

import { validateWeightAttribute } from './mass-id-sorting.helpers';

describe('mass-id-sorting helpers', () => {
  describe('validateWeightAttribute', () => {
    it('should return format error when value is valid but format is invalid', () => {
      const attribute: DocumentEventAttribute = {
        format: 'GRAM' as any, // Invalid format
        isPublic: true,
        name: 'test',
        value: 10,
      };

      const result = validateWeightAttribute(attribute, 'test weight');

      expect(result).toEqual({
        isError: true,
        message: 'Invalid test weight format',
      });
    });

    it('should return null when both value and format are valid', () => {
      const attribute: DocumentEventAttribute = {
        format: MethodologyDocumentEventAttributeFormat.KILOGRAM,
        isPublic: true,
        name: 'test',
        value: 10,
      };

      const result = validateWeightAttribute(attribute, 'test weight');

      expect(result).toBe(null);
    });
  });
});
