import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  stubDocument,
  stubDocumentEvent,
  stubMassIDDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { stubArray } from '@carrot-fndn/shared/testing';
import { getYear } from 'date-fns';

import {
  getDocumentEventById,
  getLastYearEmissionAndCompostingMetricsEvent,
  getParticipantActorType,
  getRulesMetadataEvent,
} from './document.getters';

const testEmissionAndCompostingMetricsEvent = (
  documentYear: number,
  referenceYear: number,
) => {
  const targetEvent = stubDocumentEvent({
    metadata: {
      attributes: [
        {
          isPublic: true,
          name: 'Reference Year',
          value: referenceYear,
        },
      ],
    },
    name: `${'Emissions & Composting Metrics'} (${getYear(new Date())})`,
  });

  const documentWithEmissionAndCompostingMetricsEvent = stubDocument(
    {
      externalEvents: [targetEvent, ...stubArray(() => stubDocumentEvent())],
    },
    false,
  );

  return {
    result: getLastYearEmissionAndCompostingMetricsEvent({
      documentWithEmissionAndCompostingMetricsEvent,
      documentYear,
    }),
    targetEvent,
  };
};

describe('Document getters', () => {
  describe('getLastYearEmissionAndCompostingMetricsEvent', () => {
    it('should return correct emission and composting metrics event when reference year matches last year', () => {
      const documentYear = 2024;
      const lastYear = documentYear - 1;
      const { result, targetEvent } = testEmissionAndCompostingMetricsEvent(
        documentYear,
        lastYear,
      );

      expect(result).toEqual(targetEvent);
    });

    it('should return undefined when reference year does not match last year', () => {
      const documentYear = 2024;
      const wrongYear = 2022;
      const { result } = testEmissionAndCompostingMetricsEvent(
        documentYear,
        wrongYear,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when reference year is empty string', () => {
      const eventWithEmptyStringYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: 'Reference Year',
              value: '',
            },
          ],
        },
        name: `${'Emissions & Composting Metrics'} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument(
        {
          externalEvents: [eventWithEmptyStringYear],
        },
        false,
      );

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentYear: 2024,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when reference year is zero', () => {
      const eventWithZeroYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: 'Reference Year',
              value: 0,
            },
          ],
        },
        name: `${'Emissions & Composting Metrics'} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument(
        {
          externalEvents: [eventWithZeroYear],
        },
        false,
      );

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentYear: 2024,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when reference year is negative', () => {
      const eventWithNegativeYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: 'Reference Year',
              value: -1,
            },
          ],
        },
        name: `${'Emissions & Composting Metrics'} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument(
        {
          externalEvents: [eventWithNegativeYear],
        },
        false,
      );

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentYear: 2024,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined if the emission and composting metrics event is not found', () => {
      const documentWithEmissionAndCompostingMetricsEvent = stubDocument();

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentYear: 2024,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when event name does not contain emission and composting metrics', () => {
      const nonTargetEvent = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: 'Reference Year',
              value: 2023,
            },
          ],
        },
        name: 'OTHER_EVENT',
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument(
        {
          externalEvents: [nonTargetEvent],
        },
        false,
      );

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentYear: 2024,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getRulesMetadataEvent', () => {
    it('should return the rules metadata event', () => {
      const rulesMetadataEvent = stubDocumentEvent({ name: 'RULES METADATA' });

      const document = stubDocument(
        {
          externalEvents: [
            rulesMetadataEvent,
            ...stubArray(() => stubDocumentEvent()),
          ],
        },
        false,
      );

      const result = getRulesMetadataEvent(document);

      expect(result).toEqual(rulesMetadataEvent);
    });

    it('should return undefined if the rules metadata event was not found', () => {
      const document = stubDocument(
        {
          externalEvents: stubArray(() =>
            stubDocumentEvent({ name: 'Pick-up' }),
          ),
        },
        false,
      );

      const result = getRulesMetadataEvent(document);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the document is undefined', () => {
      const result = getRulesMetadataEvent(undefined);

      expect(result).toBe(undefined);
    });
  });

  describe('getParticipantActorType', () => {
    it(`should return "Waste Generator" when the event is a pick up at the source`, () => {
      const sourcePickUpEvent = stubDocumentEvent({ name: 'Pick-up' });
      const document = stubDocument(
        {
          externalEvents: [
            sourcePickUpEvent,
            stubDocumentEvent({ name: 'Drop-off' }),
            stubDocumentEvent({ name: 'Pick-up' }),
            stubDocumentEvent({ name: 'Drop-off' }),
          ],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: sourcePickUpEvent,
      });

      expect(participantActorType).toEqual('Waste Generator');
    });

    it(`should return "Processor" when the event is a drop off at processor`, () => {
      const processorDropOffEvent = stubDocumentEvent({ name: 'Drop-off' });
      const document = stubDocument(
        {
          externalEvents: [
            stubDocumentEvent({ name: 'Pick-up' }),
            processorDropOffEvent,
            stubDocumentEvent({ name: 'Pick-up' }),
            stubDocumentEvent({ name: 'Drop-off' }),
          ],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: processorDropOffEvent,
      });

      expect(participantActorType).toEqual('Processor');
    });

    it(`should return "Processor" when the event is a pick up at processor`, () => {
      const processorPickUpEvent = stubDocumentEvent({ name: 'Pick-up' });
      const document = stubDocument(
        {
          externalEvents: [
            stubDocumentEvent({ name: 'Pick-up' }),
            stubDocumentEvent({ name: 'Drop-off' }),
            processorPickUpEvent,
            stubDocumentEvent({ name: 'Drop-off' }),
          ],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: processorPickUpEvent,
      });

      expect(participantActorType).toEqual('Processor');
    });

    it(`should return "Recycler" when the event is a drop off at recycler`, () => {
      const recyclerDropOffEvent = stubDocumentEvent({ name: 'Drop-off' });
      const document = stubDocument(
        {
          externalEvents: [
            stubDocumentEvent({ name: 'Pick-up' }),
            stubDocumentEvent({ name: 'Drop-off' }),
            stubDocumentEvent({ name: 'Pick-up' }),
            recyclerDropOffEvent,
          ],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: recyclerDropOffEvent,
      });

      expect(participantActorType).toEqual('Recycler');
    });

    it('should return undefined when the document has no pick up events', () => {
      const dropOffEvent = stubDocumentEvent({ name: 'Drop-off' });
      const document = stubDocument(
        {
          externalEvents: [dropOffEvent],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: dropOffEvent,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has no drop off events', () => {
      const pickUpEvent = stubDocumentEvent({ name: 'Pick-up' });
      const document = stubDocument(
        {
          externalEvents: [pickUpEvent],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: pickUpEvent,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has no external events', () => {
      const event = stubDocumentEvent({ name: 'Pick-up' });
      const document = stubDocument({}, false);

      document.externalEvents = undefined;

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has empty external events array', () => {
      const event = stubDocumentEvent({ name: 'Pick-up' });
      const document = stubDocument(
        {
          externalEvents: [],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has non-array external events', () => {
      const event = stubDocumentEvent({ name: 'Pick-up' });
      const document = {
        ...stubDocument(undefined, false),
        externalEvents: 'not an array',
      } as unknown as Document;

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the event is neither a pick-up nor a drop-off event', () => {
      const otherEvent = stubDocumentEvent({ name: 'Accreditation Context' });
      const document = stubDocument(
        {
          externalEvents: [
            stubDocumentEvent({ name: 'Pick-up' }),
            stubDocumentEvent({ name: 'Drop-off' }),
            otherEvent,
          ],
        },
        false,
      );

      const participantActorType = getParticipantActorType({
        document,
        event: otherEvent,
      });

      expect(participantActorType).toBeUndefined();
    });
  });

  describe('getDocumentEventById', () => {
    it('should return the document event by id', () => {
      const documentEvent = stubDocumentEvent();
      const document = stubMassIDDocument({
        externalEvents: [documentEvent],
      });

      const result = getDocumentEventById(document, documentEvent.id);

      expect(result).toEqual(documentEvent);
    });

    it('should return undefined when the document event is not found', () => {
      const document = stubMassIDDocument();

      const result = getDocumentEventById(document, 'non-existent-id');

      expect(result).toBeUndefined();
    });
  });
});
