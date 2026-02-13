import { documentManifestDataLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { TRANSPORT_MANIFEST } = DocumentEventName;

export const handler = documentManifestDataLambda({
  documentManifestType: TRANSPORT_MANIFEST,
});
