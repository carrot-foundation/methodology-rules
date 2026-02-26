import {
  type DocumentType,
  getRegisteredLayouts,
} from '@carrot-fndn/shared/document-extractor';
import { logger } from '@carrot-fndn/shared/helpers';
import { Command } from '@commander-js/extra-typings';

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'scaleTicket',
  'transportManifest',
  'recyclingManifest',
];

export const listLayoutsCommand = new Command('list-layouts')
  .description('List all registered document layouts')
  .argument('[document-type]', 'Filter by document type')
  .action((documentType?: string) => {
    const layouts = getRegisteredLayouts();

    if (documentType) {
      if (!VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
        logger.error(
          `Unknown document type: ${documentType}\nValid types: ${VALID_DOCUMENT_TYPES.join(', ')}`,
        );
        process.exitCode = 1;

        return;
      }

      const filtered = layouts.filter(
        (layout) => layout.documentType === documentType,
      );

      if (filtered.length === 0) {
        logger.info(`No layouts registered for: ${documentType}`);

        return;
      }

      logger.info(`${documentType}:`);

      for (const layout of filtered) {
        logger.info(`  - ${layout.layoutId}`);
      }

      return;
    }

    const grouped = new Map<string, string[]>();

    for (const layout of layouts) {
      const existing = grouped.get(layout.documentType) ?? [];

      existing.push(layout.layoutId);
      grouped.set(layout.documentType, existing);
    }

    for (const [type, layoutIds] of grouped) {
      logger.info(`${type}:`);

      for (const layoutId of layoutIds) {
        logger.info(`  - ${layoutId}`);
      }
    }
  });
