import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import {
  AIParameters,
  DocumentManifestDataProcessor,
  type DocumentManifestType,
} from './document-manifest-data.processor';

export const documentManifestDataLambda = ({
  aiParameters,
  documentManifestType,
}: {
  aiParameters: AIParameters;
  documentManifestType: DocumentManifestType;
}) => {
  const instance = new DocumentManifestDataProcessor({
    aiParameters,
    documentManifestType,
  });

  return wrapRuleIntoLambdaHandler(instance);
};
