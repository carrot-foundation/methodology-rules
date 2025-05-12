import { certificateUniquenessCheckLambda } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { GAS_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologyName } from '@carrot-fndn/shared/methodologies/bold/types';

export const handler = certificateUniquenessCheckLambda(
  GAS_ID,
  BoldMethodologyName.CARBON,
);
