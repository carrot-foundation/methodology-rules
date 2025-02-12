import type { Document } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import type { Maybe } from '@carrot-fndn/shared/types';

import { DocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNonEmptyString, logger } from '@carrot-fndn/shared/helpers';

import { validateDocument } from './document-helpers.typia';

export const loadParentDocument = async (
  loaderService: DocumentLoaderService,
  key: Maybe<string>,
): Promise<Document | undefined> => {
  if (!isNonEmptyString(key)) {
    logger.info(`[loadParentDocument] Invalid key provided: ${key}`);

    return undefined;
  }

  const { document } = await loaderService.load({ key });

  const validation = validateDocument(document);

  if (!validation.success) {
    logger.warn(
      { validationErrors: validation.errors },
      `[loadParentDocument] Invalid parent document ${key}`,
    );

    return undefined;
  }

  return validation.data;
};
