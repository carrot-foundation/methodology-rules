import {
  stubDocumentEventWithMetadata,
  stubDocumentWithOneActorType,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

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
