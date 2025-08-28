import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

import { RECYCLING_MANIFEST_AI_CONTEXT } from '@carrot-fndn/shared/methodologies/ai-attachment-validator';

const { RECYCLING_MANIFEST } = DocumentEventName;

export const handler = documentManifestDataLambda({
  aiParameters: {
    additionalContext: RECYCLING_MANIFEST_AI_CONTEXT,
  },
  documentManifestType: RECYCLING_MANIFEST,
});
