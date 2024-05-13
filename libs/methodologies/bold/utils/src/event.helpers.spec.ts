import type { DocumentEvent } from '@carrot-fndn/methodologies/bold/types';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/testing';
import { stubArray } from '@carrot-fndn/shared/testing';
import { validate } from 'typia';

import { calculateDistanceBetweenTwoEvents } from './event.helpers';

describe('Event Helpers', () => {
  describe('calculateDistanceBetweenTwoEvents', () => {
    it('should return the geometric distance between the address of two events', () => {
      const events = stubArray(() => stubDocumentEvent(), 2);

      const validation = validate<[DocumentEvent, DocumentEvent]>(events);

      const result =
        validation.success &&
        calculateDistanceBetweenTwoEvents(...validation.data);

      expect(result).toEqual(expect.any(Number));
    });
  });
});
