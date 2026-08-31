import { getAuditUrl } from '@carrot-fndn/shared/env';
import { httpRequest } from '@carrot-fndn/shared/http-request';
import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import { faker } from '@faker-js/faker';

import { seedDocument } from './document.seeds';

vi.mock('@carrot-fndn/shared/env', () => ({
  getAuditUrl: vi.fn(),
}));
vi.mock('@carrot-fndn/shared/http-request', () => ({
  httpRequest: vi.fn(),
}));

const mockGetAuditUrl = vi.mocked(getAuditUrl);
const mockHttpRequest = vi.mocked(httpRequest);

describe('seedDocument', () => {
  beforeEach(() => {
    mockGetAuditUrl.mockReturnValue('https://audit.example');
    vi.clearAllMocks();
  });

  it('should exclude an invalid response body from its error', async () => {
    const responseSecret = faker.string.uuid();

    mockHttpRequest.mockResolvedValue({
      data: { authorization: responseSecret },
      status: 500,
    } as never);

    await expect(seedDocument()).rejects.toThrow(
      'Unexpected response shape from https://audit.example/documents: HTTP 500',
    );
    await expect(seedDocument()).rejects.not.toThrow(responseSecret);
  });

  it('should exclude a non-object response from its error', async () => {
    const responseSecret = faker.string.uuid();

    mockHttpRequest.mockResolvedValue(responseSecret as never);

    await expect(seedDocument()).rejects.toThrow(
      'Unexpected response from https://audit.example/documents: HTTP N/A',
    );
    await expect(seedDocument()).rejects.not.toThrow(responseSecret);
  });

  it('should return the created document identifier', async () => {
    const documentId = faker.string.uuid();
    const externalEvent = stubDocumentEvent();

    mockHttpRequest.mockResolvedValue({
      data: { document: { id: documentId } },
      status: 201,
    } as never);

    await expect(
      seedDocument({ partialDocument: { externalEvents: [externalEvent] } }),
    ).resolves.toBe(documentId);
  });
});
