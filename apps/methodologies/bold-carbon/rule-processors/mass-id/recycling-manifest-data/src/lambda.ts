import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';

export const handler = documentManifestDataLambda({
  documentManifestType: 'Recycling Manifest',
});
