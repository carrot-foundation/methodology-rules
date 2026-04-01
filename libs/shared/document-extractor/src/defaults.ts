import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { BoldDocumentType } from './document-extractor.types';

export const DEFAULT_LAYOUTS: Record<BoldDocumentType, NonEmptyString[]> = {
  recyclingManifest: [
    'cdf-sinfat',
    'cdf-custom-1',
    'cdf-sinir',
  ] as NonEmptyString[],
  scaleTicket: [],
  transportManifest: [
    'mtr-sinir',
    'mtr-sigor',
    'mtr-sinfat',
  ] as NonEmptyString[],
};

export const getDefaultLayouts = (
  documentType: BoldDocumentType,
): NonEmptyString[] => DEFAULT_LAYOUTS[documentType];
