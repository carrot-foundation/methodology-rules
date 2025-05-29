import { GAS_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { certificateUniquenessCheckLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/certificate-uniqueness-check';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';

export const handler = certificateUniquenessCheckLambda(
  GAS_ID,
  BoldMethodologySlug.CARBON,
);
