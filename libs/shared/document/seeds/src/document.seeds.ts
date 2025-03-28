import type {
  AuditApiDocumentPrimitiveEntity,
  MethodologyDocument,
  NonEmptyString,
  Uri,
} from '@carrot-fndn/shared/types';
import type { Logger } from 'pino';
import type { PartialDeep } from 'type-fest';

import {
  isNonEmptyObject,
  logger as pinoLogger,
} from '@carrot-fndn/shared/helpers';
import { httpRequest } from '@carrot-fndn/shared/http-request';
import { faker } from '@faker-js/faker';
import { assert, random } from 'typia';

export const seedDocument = async ({
  endpoint,
  logger = pinoLogger,
  partialDocument = {},
}: {
  endpoint: Uri;
  logger?: Logger;
  partialDocument?: PartialDeep<MethodologyDocument> | undefined;
}): Promise<NonEmptyString> => {
  const documentId = partialDocument.id ?? faker.string.uuid();

  const response = await httpRequest(
    {
      baseURL: endpoint,
      data: {
        ...random<AuditApiDocumentPrimitiveEntity>(),
        createdAt: new Date().toISOString(),
        document: {
          ...random<MethodologyDocument>(),
          ...partialDocument,
          createdAt: new Date().toISOString(),
          dataSetName: 'TEST',
          externalCreatedAt: new Date().toISOString(),
          id: documentId,
          status: 'OPEN',
          tags: {
            'e2e-test': 'true',
            'test-source': 'methodology-rules',
          },
        },
        documentId,
        versionDate: new Date().toISOString(),
      },
      method: 'POST',
    },
    { logger },
  );

  if (!isNonEmptyObject(response)) {
    throw new Error(
      `Unexpected response from ${endpoint}: ${JSON.stringify(response)}`,
    );
  }

  const {
    document: { id },
  } = assert<AuditApiDocumentPrimitiveEntity>(response.data);

  logger.info(`Created document with { documentId: ${id} }`);

  return id;
};
