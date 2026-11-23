import { isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { type BoldAttributeValue } from '@carrot-fndn/shared/types';

export interface WasteTypeEvidence {
  localWasteClassificationId?: string;
  type: string;
}

export const WASTE_TYPE_EVIDENCE_FIELDS = [
  'type',
  'localWasteClassificationId',
] as const satisfies ReadonlyArray<keyof WasteTypeEvidence>;

export const getWasteTypeEvidence = ({
  localWasteClassificationId,
  type,
}: {
  localWasteClassificationId: BoldAttributeValue | undefined;
  type: string;
}): WasteTypeEvidence => ({
  ...(isNonEmptyString(localWasteClassificationId) && {
    localWasteClassificationId,
  }),
  type,
});
