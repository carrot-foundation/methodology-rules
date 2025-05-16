import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import {
  DocumentManifestProcessor,
  type DocumentManifestType,
} from './document-manifest.processor';

export const documentManifestLambda = (
  documentManifestType: DocumentManifestType,
) => {
  const instance = new DocumentManifestProcessor(documentManifestType);

  return wrapRuleIntoLambdaHandler(instance);
};
