import type { PartialDeep } from 'type-fest';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  MethodologyDocumentEventName,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { random } from 'typia';

const { ACTOR } = MethodologyDocumentEventName;
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
