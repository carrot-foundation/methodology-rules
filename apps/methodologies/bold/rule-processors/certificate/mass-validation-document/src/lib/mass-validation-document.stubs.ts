import type { PartialDeep } from 'type-fest';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  stubMassValidationDocument,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { METHODOLOGY_SLUG as METHODOLOGY_SLUG_VALUE } from '@carrot-fndn/methodologies/bold/utils';

const { ACTOR } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE, METHODOLOGY_SLUG } = DocumentEventAttributeName;

export const stubMassValidationDocumentWithBoldMethodology = (
  partialDocument?: PartialDeep<Document>,
) =>
  stubDocument({
    ...stubMassValidationDocument(),
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
        [METHODOLOGY_SLUG, METHODOLOGY_SLUG_VALUE],
        [ACTOR_TYPE, AUDITOR],
      ]),
    ],
    ...partialDocument,
  });
