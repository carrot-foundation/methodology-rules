import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import type { Maybe } from '@carrot-fndn/shared/types';

import { DocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';

import { validateDocument } from './document-helpers.typia';

export const loadDocument = async (
  loaderService: DocumentLoaderService,
  key: Maybe<string>,
): Promise<Document | undefined> => {
  if (!isNonEmptyString(key)) {
    logger.info(`[loadDocument] Invalid key provided: ${key}`);

    return undefined;
  }

  try {
    const { document } = await loaderService.load({ key });

    const validation = validateDocument(document);

    if (!validation.success) {
      logger.warn(
        { validationErrors: validation.errors },
        `[loadDocument] Invalid document ${key}`,
      );

      return undefined;
    }

    return validation.data;
  } catch (error) {
    logger.warn({ error }, `[loadDocument] Failed to load document: ${key}`);

    return undefined;
  }
};
