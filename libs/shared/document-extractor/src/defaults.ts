import type { DocumentType } from './document-extractor.types';

export const DEFAULT_LAYOUTS: Record<DocumentType, string[]> = {
  recyclingManifest: ['cdf-brazil'],
  scaleTicket: ['layout-1'],
  transportManifest: ['mtr-brazil', 'mtr-cetesb-sp'],
};

export const getDefaultLayouts = (documentType: DocumentType): string[] =>
  DEFAULT_LAYOUTS[documentType];
