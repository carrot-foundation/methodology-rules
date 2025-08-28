import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { TRANSPORT_MANIFEST_AI_CONTEXT } from '@carrot-fndn/shared/methodologies/ai-attachment-validator';

const { TRANSPORT_MANIFEST } = DocumentEventName;

export const handler = documentManifestDataLambda({
  aiParameters: {
    additionalContext: TRANSPORT_MANIFEST_AI_CONTEXT,
  },
  documentManifestType: TRANSPORT_MANIFEST,
});
