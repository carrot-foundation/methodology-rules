import { documentManifestLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { RECYCLING_MANIFEST } = DocumentEventName;

export const handler = documentManifestLambda(RECYCLING_MANIFEST);
