import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';

import { getAuditorActorEvent } from './document.getters';

const { ACTOR } = DocumentEventName;
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
});
