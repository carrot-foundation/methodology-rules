import type { BoldDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubArray } from '@carrot-fndn/shared/testing';

import { calculateDistanceBetweenTwoEvents } from './event.helpers';

describe('Event Helpers', () => {
  describe('calculateDistanceBetweenTwoEvents', () => {
    it('should return the geometric distance between the address of two events', () => {
      const events = stubArray(() => stubDocumentEvent(), 2) as [
        BoldDocumentEvent,
        BoldDocumentEvent,
      ];

      const result = calculateDistanceBetweenTwoEvents(...events);

      expect(result).toEqual(expect.any(Number));
    });
  });
});
