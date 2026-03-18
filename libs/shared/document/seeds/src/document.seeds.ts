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
  UriSchema,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import type {
  ApiDocumentCreateDto,
  AuditApiDocumentPrimitiveEntity,
} from './document.seeds.types';

const stubMethodologyDocument = (): MethodologyDocument => ({
  category: faker.string.sample(),
  createdAt: new Date().toISOString(),
  currentValue: faker.number.int(),
  dataSetName: 'TEST' as MethodologyDocument['dataSetName'],
  externalCreatedAt: new Date().toISOString(),
  id: faker.string.uuid(),
  isPubliclySearchable: faker.datatype.boolean(),
  measurementUnit: faker.string.sample(),
  primaryAddress: {
    city: faker.location.city(),
    countryCode: faker.location.countryCode(),
    countryState: faker.location.state(),
    id: faker.string.uuid(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    neighborhood: faker.string.sample(),
    number: faker.string.numeric(),
    participantId: faker.string.uuid(),
    piiSnapshotId: faker.string.uuid(),
    street: faker.location.street(),
    zipCode: faker.location.zipCode(),
  },
  primaryParticipant: {
    countryCode: faker.location.countryCode(),
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    piiSnapshotId: faker.string.uuid(),
    taxId: faker.string.numeric(14),
    taxIdType: faker.string.sample(),
    type: faker.string.sample(),
  },
  status: 'OPEN',
  updatedAt: new Date().toISOString(),
});

const mapDocumentParts = (
  document: Partial<MethodologyDocument>,
): ApiDocumentCreateDto['parts'] =>
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
  const auditUrlFromEnv = process.env['AUDIT_URL'];

  let endpoint: Uri;
  try {
    const auditUrl = UriSchema.parse(auditUrlFromEnv);
    endpoint = `${auditUrl}/documents`;
  } catch {
    throw new Error(
      "Invalid process.env['AUDIT_URL']: unable to build endpoint as type Uri. Please set AUDIT_URL to a valid non-empty URI.",
    );
  }

  const document: MethodologyDocument = {
    ...stubMethodologyDocument(),
    ...partialDocument,
    createdAt: new Date().toISOString(),
    externalCreatedAt: new Date().toISOString(),
    id: documentId,
    status: 'OPEN',
    tags: {
      'e2e-test': 'true',
      'test-source': 'methodology-rules',
    },
  };

  const data: ApiDocumentCreateDto = {
    document,
    documentId,
    parts: mapDocumentParts(partialDocument),
    snapshotId: faker.string.uuid(),
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
  } = response.data as AuditApiDocumentPrimitiveEntity;

  logger.info(`Created document with { documentId: ${id} }`);

  return id;
};
