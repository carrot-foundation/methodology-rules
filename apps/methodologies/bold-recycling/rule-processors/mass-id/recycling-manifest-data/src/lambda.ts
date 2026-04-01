import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { RECYCLING_MANIFEST } = BoldDocumentEventName;

export const handler = documentManifestDataLambda({
  documentManifestType: RECYCLING_MANIFEST,
});
