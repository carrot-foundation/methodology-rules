import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { DocumentEntity, DocumentLoader } from './document-loader.types';

import { CachedDocumentLoaderService } from './cached-document-loader.service';
import { stubDocumentEntity, stubDocumentKeyDto } from './document.stubs';

const makeDelegate = (
  result: DocumentEntity,
  onLoad?: () => void,
): DocumentLoader =>
  ({
    load: () => {
      onLoad?.();

      return Promise.resolve(result);
    },
  }) as DocumentLoader;

describe('CachedDocumentLoaderService', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'document-cache-'),
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
  });

  it('should call delegate and return document on cache miss', async () => {
    const document = stubDocumentEntity();
    const service = new CachedDocumentLoaderService(
      makeDelegate(document),
      temporaryDirectory,
    );

    const result = await service.load(stubDocumentKeyDto());

    expect(result).toStrictEqual(document);
  });

  it('should return cached document without calling delegate on second call with same key', async () => {
    const document = stubDocumentEntity();
    let delegateCallCount = 0;
    const service = new CachedDocumentLoaderService(
      makeDelegate(document, () => {
        delegateCallCount++;
      }),
      temporaryDirectory,
    );
    const key = stubDocumentKeyDto();

    await service.load(key);
    const result = await service.load(key);

    expect(result).toStrictEqual(document);
    expect(delegateCallCount).toBe(1);
  });

  it('should use separate cache entries for different keys', async () => {
    const document1 = stubDocumentEntity();
    const document2 = stubDocumentEntity();
    let calls = 0;
    const delegate: DocumentLoader = {
      load: () => {
        calls++;

        return Promise.resolve(calls === 1 ? document1 : document2);
      },
    };
    const service = new CachedDocumentLoaderService(
      delegate,
      temporaryDirectory,
    );

    const result1 = await service.load({ key: 'key-1' });
    const result2 = await service.load({ key: 'key-2' });

    expect(result1).toStrictEqual(document1);
    expect(result2).toStrictEqual(document2);
    expect(calls).toBe(2);
  });

  it('should still return the document when cache write fails', async () => {
    const document = stubDocumentEntity();
    const readOnlyDirectory = '/nonexistent/readonly/path';
    const service = new CachedDocumentLoaderService(
      makeDelegate(document),
      readOnlyDirectory,
    );

    const result = await service.load(stubDocumentKeyDto());

    expect(result).toStrictEqual(document);
  });

  it('should create cache directory if it does not exist', async () => {
    const nestedCacheDirectory = path.join(
      temporaryDirectory,
      'nested',
      'cache',
    );
    const document = stubDocumentEntity();
    const service = new CachedDocumentLoaderService(
      makeDelegate(document),
      nestedCacheDirectory,
    );

    const result = await service.load(stubDocumentKeyDto());

    expect(result).toStrictEqual(document);
  });
});
