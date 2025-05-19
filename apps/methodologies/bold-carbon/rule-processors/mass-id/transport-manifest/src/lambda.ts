import { documentManifestLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { TRANSPORT_MANIFEST } = DocumentEventName;

export const handler = documentManifestLambda(TRANSPORT_MANIFEST);
