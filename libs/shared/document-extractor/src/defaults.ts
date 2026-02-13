import type { DocumentType } from './document-extractor.types';

export const DEFAULT_LAYOUTS: Record<DocumentType, string[]> = {
  recyclingManifest: ['cdf-sinfat', 'cdf-custom-1', 'cdf-sinir'],
  scaleTicket: ['layout-1'],
  transportManifest: ['mtr-sinir', 'mtr-sigor', 'mtr-sinfat'],
};

export const getDefaultLayouts = (documentType: DocumentType): string[] =>
  DEFAULT_LAYOUTS[documentType];
