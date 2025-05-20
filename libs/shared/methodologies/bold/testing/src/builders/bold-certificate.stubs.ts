import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { random } from 'typia';

import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '../stubs';
import {
  mergeEventsMaps,
  mergeMetadataAttributes,
  type MetadataAttributeParameter,
} from './bold.builder.helpers';
import {
  type StubBoldDocumentEventParameters,
  type StubBoldDocumentParameters,
} from './bold.stubs.types';

const { RULE_RESULT_DETAILS, SLUG } = DocumentEventAttributeName;

export const REWARDS_DISTRIBUTION_RULE_SLUG = 'rewards-distribution';

const defaultRulesMetadataAttributes: MetadataAttributeParameter[] = [
  [RULE_RESULT_DETAILS, random<CertificateRewardDistributionOutput>()],
  [SLUG, REWARDS_DISTRIBUTION_RULE_SLUG],
];

export const stubBoldCertificateRewardsDistributionMetadataEvent = ({
  metadataAttributes,
  partialDocumentEvent,
}: StubBoldDocumentEventParameters = {}): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(
    {
      ...partialDocumentEvent,
      name: REWARDS_DISTRIBUTION_RULE_SLUG,
    },
    mergeMetadataAttributes(defaultRulesMetadataAttributes, metadataAttributes),
  );

const boldCertificateExternalEventsMap = new Map([
  [
    REWARDS_DISTRIBUTION_RULE_SLUG,
    stubBoldCertificateRewardsDistributionMetadataEvent(),
  ],
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
