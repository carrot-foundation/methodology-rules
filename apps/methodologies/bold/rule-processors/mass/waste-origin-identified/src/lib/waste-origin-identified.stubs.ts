import {
  stubDocumentEventWithMetadata,
  stubDocumentWithOneActorType,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/types';

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
