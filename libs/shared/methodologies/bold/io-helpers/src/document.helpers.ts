import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import type { Maybe } from '@carrot-fndn/shared/types';

import { type DocumentLoader } from '@carrot-fndn/shared/document/loader';
import { isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';

import { validateDocument } from './document-helpers.validators';

export const loadDocument = async (
  loaderService: DocumentLoader,
  key: Maybe<string>,
): Promise<BoldDocument | undefined> => {
  if (!isNonEmptyString(key)) {
    logger.info(`[loadDocument] Invalid key provided: ${key}`);

    return undefined;
  }

  try {
    const { document } = await loaderService.load({ key });

    const validation = validateDocument(document);

    if (!validation.success) {
      logger.error(
        { documentKey: key, err: validation.error, operation: 'loadDocument' },
        '[loadDocument] Invalid document',
      );

      return undefined;
    }

    return validation.data;
  } catch (error) {
    logger.warn({ error }, `[loadDocument] Failed to load document: ${key}`);

    return undefined;
  }
};
