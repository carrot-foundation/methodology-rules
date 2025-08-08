import { stubBoldMassIdSortingEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEvent,
  type DocumentEventAttribute,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

import {
  getValidatedEventValues,
  getValidatedWeightAttributes,
  validateWeightAttribute,
} from './mass-id-sorting.helpers';

describe('mass-id-sorting helpers', () => {
  describe('validateWeightAttribute', () => {
    it('should return format error when value is valid but format is invalid', () => {
      const attribute: DocumentEventAttribute = {
        format: 'GRAM' as any,
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

  describe('getValidatedEventValues', () => {
    it('should return error when eventBeforeSorting is undefined', () => {
      const sortingEvent = {
        value: 10,
      } as unknown as DocumentEvent;

      const result = getValidatedEventValues(undefined, sortingEvent);

      expect(result).toEqual({
        isError: true,
        message: 'Event before sorting is undefined',
      });
    });
  });

  describe('getValidatedWeightAttributes', () => {
    it('should return error when deductedWeight is greater than or equal to grossWeight', () => {
      const sortingEvent = stubBoldMassIdSortingEvent({
        metadataAttributes: [
          {
            format: MethodologyDocumentEventAttributeFormat.KILOGRAM,
            name: DocumentEventAttributeName.GROSS_WEIGHT,
            value: 10,
          },
          {
            format: MethodologyDocumentEventAttributeFormat.KILOGRAM,
            name: DocumentEventAttributeName.DEDUCTED_WEIGHT,
            value: 15,
          },
        ],
      });

      const result = getValidatedWeightAttributes(sortingEvent);

      expect(result).toEqual({
        isError: true,
        message: 'Deducted weight (15) must be less than gross weight (10)',
      });
    });

    it('should return error when deductedWeight equals grossWeight', () => {
      const sortingEvent = stubBoldMassIdSortingEvent({
        metadataAttributes: [
          {
            format: MethodologyDocumentEventAttributeFormat.KILOGRAM,
            name: DocumentEventAttributeName.GROSS_WEIGHT,
            value: 10,
          },
          {
            format: MethodologyDocumentEventAttributeFormat.KILOGRAM,
            name: DocumentEventAttributeName.DEDUCTED_WEIGHT,
            value: 10,
          },
        ],
      });

      const result = getValidatedWeightAttributes(sortingEvent);

      expect(result).toEqual({
        isError: true,
        message: 'Deducted weight (10) must be less than gross weight (10)',
      });
    });
  });
});
