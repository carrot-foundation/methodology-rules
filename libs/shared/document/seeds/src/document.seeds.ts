import type { Logger } from 'pino';

import {
  isNonEmptyObject,
  logger as pinoLogger,
} from '@carrot-fndn/shared/helpers';
import { httpRequest } from '@carrot-fndn/shared/http-request';
import {
  type MethodologyDocument,
  type NonEmptyString,
  type Uri,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { assert, random } from 'typia';

import type {
  ApiDocumentCreateDto,
  AuditApiDocumentPartSnapshotEntity,
  AuditApiDocumentPrimitiveEntity,
} from './document.seeds.types';

const mapDocumentParts = (
  document: Partial<MethodologyDocument>,
): AuditApiDocumentPartSnapshotEntity[] =>
  document.externalEvents?.map((event) => ({
    part: event,
    partId: event.id,
    path: 'externalEvents',
  })) ?? [];

export const seedDocument = async ({
  logger = pinoLogger,
  partialDocument = {},
}: {
  logger?: Logger;
  partialDocument?: Partial<MethodologyDocument>;
} = {}): Promise<NonEmptyString> => {
  const documentId = faker.string.uuid();
  const endpoint = `${assert<Uri>(process.env['AUDIT_URL'])}/documents`;

  const data: ApiDocumentCreateDto = {
    ...random<ApiDocumentCreateDto>(),
    document: {
      ...random<MethodologyDocument>(),
      ...partialDocument,
      createdAt: new Date().toISOString(),
      externalCreatedAt: new Date().toISOString(),
      id: documentId,
      status: 'OPEN',
      tags: {
        'e2e-test': 'true',
        'test-source': 'methodology-rules',
      },
    },
    documentId,
    parts: mapDocumentParts(partialDocument),
    versionDate: new Date().toISOString(),
  };

  const response = await httpRequest(
    {
      baseURL: endpoint,
      data,
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
