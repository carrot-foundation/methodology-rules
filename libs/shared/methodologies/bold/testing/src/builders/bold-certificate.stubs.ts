import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  type MetadataAttributeParameter,
  mergeEventsMaps,
  mergeMetadataAttributes,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { RULES_METADATA } = DocumentEventName;
const { REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT } = DocumentEventAttributeName;

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [
    REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT,
    random<CertificateRewardDistributionOutput>(),
  ],
];

export const stubBoldCertificateRulesMetadataEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: RULES_METADATA,
    },
    mergeMetadataAttributes(defaultRulesMetadataAttributes, metadataAttributes),
  );

const boldCertificateExternalEventsMap = new Map([
  [RULES_METADATA, stubBoldCertificateRulesMetadataEvent()],
]);

export const stubBoldCertificateDocument = ({
  externalEventsMap,
  partialDocument,
}: StubBoldDocumentParameters = {}): Document => {
  const mergedEventsMap = isNil(externalEventsMap)
    ? boldCertificateExternalEventsMap
    : mergeEventsMaps(boldCertificateExternalEventsMap, externalEventsMap);

  return {
    ...stubDocument(
      {
        type: random<DocumentType.GAS_ID | DocumentType.RECYCLED_ID>(),
        ...partialDocument,
        category: DocumentCategory.METHODOLOGY,
        externalEvents: [
          ...mergedEventsMap.values(),
          ...(partialDocument?.externalEvents ?? []),
        ],
      },
      false,
    ),
  };
};
