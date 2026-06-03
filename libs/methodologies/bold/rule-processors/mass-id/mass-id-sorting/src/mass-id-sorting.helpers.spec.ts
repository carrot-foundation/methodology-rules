import {
  stubBoldMassIDSortingEvent,
  stubBoldMassIDTransportManifestEvent,
  stubBoldMassIDWeighingEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEvent,
  type BoldDocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

import {
  findSortingEvents,
  getValidatedEventValues,
  getValidatedWeightAttributes,
  validateWeightAttribute,
  ValidationErrorCode,
} from './mass-id-sorting.helpers';

describe('mass-id-sorting helpers', () => {
  describe('validateWeightAttribute', () => {
    it('should return format error when value is valid but format is invalid', () => {
      const attribute: BoldDocumentEventAttribute = {
        format: 'GRAM' as any,
        isPublic: true,
        name: 'test',
        value: 10,
      };

      const result = validateWeightAttribute(attribute, 'gross');

      expect(result).toEqual({
        code: ValidationErrorCode.INVALID_GROSS_WEIGHT_FORMAT,
        isError: true,
      });
    });

    it('should return null when both value and format are valid', () => {
      const attribute: BoldDocumentEventAttribute = {
        format: DocumentEventAttributeFormat.KILOGRAM,
        isPublic: true,
        name: 'test',
        value: 10,
      };

      const result = validateWeightAttribute(attribute, 'gross');

      expect(result).toBe(null);
    });
  });

  describe('getValidatedEventValues', () => {
    it('should return error when priorEventWithValue is undefined', () => {
      const sortingEvent = {
        value: 10,
      } as unknown as BoldDocumentEvent;

      const result = getValidatedEventValues(undefined, sortingEvent);

      expect(result).toEqual({
        code: ValidationErrorCode.EVENT_BEFORE_SORTING_UNDEFINED,
        isError: true,
      });
    });
  });

  describe('getValidatedWeightAttributes', () => {
    it('should return error when deductedWeight is greater than or equal to grossWeight', () => {
      const sortingEvent = stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: DocumentEventAttributeFormat.KILOGRAM,
            name: BoldAttributeName.GROSS_WEIGHT,
            value: 10,
          },
          {
            format: DocumentEventAttributeFormat.KILOGRAM,
            name: BoldAttributeName.DEDUCTED_WEIGHT,
            value: 15,
          },
        ],
      });

      const result = getValidatedWeightAttributes(sortingEvent);

      expect(result).toEqual({
        code: ValidationErrorCode.INVALID_WEIGHT_COMPARISON,
        isError: true,
      });
    });

    it('should return error when deductedWeight equals grossWeight', () => {
      const sortingEvent = stubBoldMassIDSortingEvent({
        metadataAttributes: [
          {
            format: DocumentEventAttributeFormat.KILOGRAM,
            name: BoldAttributeName.GROSS_WEIGHT,
            value: 10,
          },
          {
            format: DocumentEventAttributeFormat.KILOGRAM,
            name: BoldAttributeName.DEDUCTED_WEIGHT,
            value: 10,
          },
        ],
      });

      const result = getValidatedWeightAttributes(sortingEvent);

      expect(result).toEqual({
        code: ValidationErrorCode.INVALID_WEIGHT_COMPARISON,
        isError: true,
      });
    });
  });

  describe('findSortingEvents', () => {
    it('should pick the last prior event with value as priorEventWithValue', () => {
      const events = [
        {
          externalCreatedAt: '2026-01-01T03:00:00.000Z',
          name: 'ANY',
          value: undefined,
        } as unknown as BoldDocumentEvent,
        {
          externalCreatedAt: '2026-01-01T03:00:01.000Z',
          name: 'ANY',
          value: 5,
        } as unknown as BoldDocumentEvent,
        {
          externalCreatedAt: '2026-01-01T03:00:02.000Z',
          name: 'ANY',
        } as unknown as BoldDocumentEvent,
        {
          externalCreatedAt: '2026-01-01T03:00:03.000Z',
          name: 'ANY',
          value: 7,
        } as unknown as BoldDocumentEvent,
        {
          externalCreatedAt: '2026-01-01T03:00:04.000Z',
          name: 'ANY',
        } as unknown as BoldDocumentEvent,
        {
          externalCreatedAt: '2026-01-01T03:00:05.000Z',
          name: 'ANY',
        } as unknown as BoldDocumentEvent,
        stubBoldMassIDSortingEvent({
          partialDocumentEvent: {
            externalCreatedAt: '2026-01-01T03:00:06.000Z',
            value: 9,
          },
        }),
      ];

      const result = findSortingEvents(
        events as unknown as BoldDocumentEvent[],
      );

      if ('isError' in result) {
        throw new Error('Expected SortingEvents, got ValidationError');
      }

      expect(result.priorEventWithValue?.value).toBe(7);
    });

    it('should select the prior value event by timestamp even when Sorting precedes it in array order', () => {
      const sortingEvent = stubBoldMassIDSortingEvent({
        partialDocumentEvent: {
          externalCreatedAt: '2026-01-01T03:00:09.000Z',
          value: 112.404,
        },
      });
      const transportManifestEvent = stubBoldMassIDTransportManifestEvent({
        partialDocumentEvent: {
          externalCreatedAt: '2026-01-01T03:00:01.000Z',
          value: 114,
        },
      });
      const weighingEvent = stubBoldMassIDWeighingEvent({
        partialDocumentEvent: {
          externalCreatedAt: '2026-01-01T03:00:03.000Z',
          value: 120,
        },
      });
      const actorEvent = {
        externalCreatedAt: '2026-01-01T03:00:00.000Z',
        name: 'ACTOR',
        value: undefined,
      } as unknown as BoldDocumentEvent;

      const result = findSortingEvents([
        actorEvent,
        sortingEvent,
        transportManifestEvent,
        weighingEvent,
      ]);

      if ('isError' in result) {
        throw new Error('Expected SortingEvents, got ValidationError');
      }

      expect(result.priorEventWithValue?.value).toBe(120);
    });

    it('should leave priorEventWithValue undefined when no value event precedes Sorting in time', () => {
      const sortingEvent = stubBoldMassIDSortingEvent({
        partialDocumentEvent: {
          externalCreatedAt: '2026-01-01T03:00:01.000Z',
          value: 100,
        },
      });
      const laterWeighingEvent = stubBoldMassIDWeighingEvent({
        partialDocumentEvent: {
          externalCreatedAt: '2026-01-01T03:00:05.000Z',
          value: 120,
        },
      });

      const result = findSortingEvents([laterWeighingEvent, sortingEvent]);

      if ('isError' in result) {
        throw new Error('Expected SortingEvents, got ValidationError');
      }

      expect(result.priorEventWithValue).toBeUndefined();
    });
  });
});
