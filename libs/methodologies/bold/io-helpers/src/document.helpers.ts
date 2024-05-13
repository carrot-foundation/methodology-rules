// TODO: replace console.log with logger https://app.clickup.com/t/3005225/CARROT-483
/* eslint eslint-comments/no-use: off */
/* eslint-disable no-console */
import type { Document } from '@carrot-fndn/methodologies/bold/types';
import type { Maybe } from '@carrot-fndn/shared/types';

import { DocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { validate } from 'typia';

export const loadParentDocument = async (
  loaderService: DocumentLoaderService,
  key: Maybe<string>,
): Promise<Document | undefined> => {
  if (!isNonEmptyString(key)) {
    console.info(`[loadParentDocument] Invalid key provided: ${key}`);

    return undefined;
  }

  const { document } = await loaderService.load({ key });

  const validation = validate<Document>(document);

  if (!validation.success) {
    console.warn(
      `[loadParentDocument] Invalid parent document ${key}:`,
      validation.errors,
    );

    return undefined;
  }

  return validation.data;
};
