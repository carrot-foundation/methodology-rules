import type { NonEmptyString } from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { random } from 'typia';

const { ACTOR } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE, METHODOLOGY_SLUG } = DocumentEventAttributeName;

export const stubMassAuditDocumentWithMethodologySlug = (
  methodologySlug?: string,
  partialDocument?: PartialDeep<Document>,
) =>
  stubDocument({
    ...stubMassAuditDocument(),
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
        [METHODOLOGY_SLUG, methodologySlug ?? random<NonEmptyString>()],
        [ACTOR_TYPE, AUDITOR],
      ]),
    ],
    ...partialDocument,
  });
