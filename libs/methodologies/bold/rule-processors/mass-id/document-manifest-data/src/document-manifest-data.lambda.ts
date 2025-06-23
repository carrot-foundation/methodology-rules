import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import {
  DocumentManifestDataProcessor,
  type DocumentManifestType,
} from './document-manifest-data.processor';

export const documentManifestDataLambda = (
  documentManifestType: DocumentManifestType,
) => {
  const instance = new DocumentManifestDataProcessor(documentManifestType);

  return wrapRuleIntoLambdaHandler(instance);
};
