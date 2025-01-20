import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

import {
  getAuditorActorEvent,
  getOpenEvent,
  getRulesMetadataEvent,
} from './document.getters';

const { ACTOR, OPEN, RULES_METADATA } = MethodologyDocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;

describe('Document getters', () => {
  describe('getAuditorActorEvent', () => {
    it('should return the auditor actor event', () => {
      const auditorActorEvent = stubDocumentEventWithMetadataAttributes(
        { name: ACTOR },
        [[ACTOR_TYPE, AUDITOR]],
      );

      const document = stubDocument({
        externalEvents: [
          auditorActorEvent,
          ...stubArray(() => stubDocumentEvent()),
        ],
      });

      const result = getAuditorActorEvent(document);

      expect(result).toEqual(auditorActorEvent);
    });

    it('should return undefined if the auditor actor event was not found', () => {
      const actorEvent = stubDocumentEventWithMetadataAttributes({
        name: ACTOR,
      });

      const document = stubDocument({
        externalEvents: [actorEvent, ...stubArray(() => stubDocumentEvent())],
      });

      const result = getAuditorActorEvent(document);

      expect(result).toBe(undefined);
    });
  });

  describe('getOpenEvent', () => {
    it('should return the open event', () => {
      const openEvent = stubDocumentEvent({ name: OPEN });

      const document = stubDocument({
        externalEvents: [...stubArray(() => stubDocumentEvent()), openEvent],
      });

      const result = getOpenEvent(document);

      expect(result).toEqual(openEvent);
    });

    it('should return undefined if the open event was not found', () => {
      const document = stubDocument({
        externalEvents: stubArray(() => stubDocumentEvent()),
      });

      const result = getOpenEvent(document);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the document is undefined', () => {
      const result = getOpenEvent(undefined);

      expect(result).toBe(undefined);
    });
  });

  describe('getRulesMetadataEvent', () => {
    it('should return the rules metadata event', () => {
      const rulesMetadataEvent = stubDocumentEvent({ name: RULES_METADATA });

      const document = stubDocument({
        externalEvents: [
          ...stubArray(() => stubDocumentEvent()),
          rulesMetadataEvent,
        ],
      });

      const result = getRulesMetadataEvent(document);

      expect(result).toEqual(rulesMetadataEvent);
    });

    it('should return undefined if the rules metadata event was not found', () => {
      const document = stubDocument({
        externalEvents: stubArray(() => stubDocumentEvent()),
      });

      const result = getRulesMetadataEvent(document);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the document is undefined', () => {
      const result = getRulesMetadataEvent(undefined);

      expect(result).toBe(undefined);
    });
  });
});
