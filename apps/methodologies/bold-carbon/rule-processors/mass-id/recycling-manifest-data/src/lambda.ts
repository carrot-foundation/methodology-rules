import { RECYCLING_MANIFEST_AI_CONTEXT } from '@carrot-fndn/shared/methodologies/ai-attachment-validator';
import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { RECYCLING_MANIFEST } = DocumentEventName;

export const handler = documentManifestDataLambda({
  aiParameters: {
    systemPrompt: RECYCLING_MANIFEST_AI_CONTEXT,
  },
  documentManifestType: RECYCLING_MANIFEST,
});
