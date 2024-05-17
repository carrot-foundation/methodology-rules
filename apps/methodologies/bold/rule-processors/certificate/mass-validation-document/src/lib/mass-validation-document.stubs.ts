import type { NonEmptyString } from '@carrot-fndn/shared/types';
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
import { random } from 'typia';

const { ACTOR } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE, METHODOLOGY_SLUG } = DocumentEventAttributeName;

export const stubMassValidationDocumentWithMethodologySlug = (
  methodologySlug?: string,
  partialDocument?: PartialDeep<Document>,
) =>
  stubDocument({
    ...stubMassValidationDocument(),
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
        [METHODOLOGY_SLUG, methodologySlug ?? random<NonEmptyString>()],
        [ACTOR_TYPE, AUDITOR],
      ]),
    ],
    ...partialDocument,
  });
