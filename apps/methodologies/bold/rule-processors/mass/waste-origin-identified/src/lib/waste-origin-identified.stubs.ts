import {
  stubDocumentEventWithMetadata,
  stubDocumentWithOneActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export const stubDocumentWithWasteOriginIdentified = (): Document =>
  stubDocumentWithOneActorType(
    DocumentEventActorType.SOURCE,
    undefined,
    stubDocumentEventWithMetadata([
      {
        isPublic: true,
        name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
        value: true,
      },
    ]),
  );
