import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologyName } from '@carrot-fndn/shared/methodologies/bold/types';

import { CertificateUniquenessCheck } from './certificate-uniqueness-check.processor';

export const certificateUniquenessCheckLambda = (
  certificateMatcher: DocumentMatcher,
  methodologyName: BoldMethodologyName,
) => {
  const instance = new CertificateUniquenessCheck(
    certificateMatcher,
    methodologyName,
  );

  return wrapRuleIntoLambdaHandler(instance);
};
