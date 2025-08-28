import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

import { AI_ADDITIONAL_CONTEXT } from './ai-prompt';

const { TRANSPORT_MANIFEST } = DocumentEventName;

export const handler = documentManifestDataLambda({
  aiParameters: {
    additionalContext: AI_ADDITIONAL_CONTEXT,
  },
  documentManifestType: TRANSPORT_MANIFEST,
});
