import { certificateUniquenessCheckLambda } from '@carrot-fndn/methodologies/bold/rule-processors/mass-id';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';

export const handler = certificateUniquenessCheckLambda(
  RECYCLED_ID,
  BoldMethodologySlug.RECYCLING,
);
