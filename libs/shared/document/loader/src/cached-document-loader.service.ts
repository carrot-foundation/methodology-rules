import { logger } from '@carrot-fndn/shared/helpers';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  DocumentEntity,
  DocumentKeyDto,
  DocumentLoader,
} from './document-loader.types';

export class CachedDocumentLoaderService implements DocumentLoader {
  constructor(
    private readonly delegate: DocumentLoader,
    private readonly cacheDirectory: string,
  ) {}

  async load(dto: DocumentKeyDto): Promise<DocumentEntity> {
    const cacheKey = createHash('sha256').update(dto.key).digest('hex');
    const filePath = path.join(this.cacheDirectory, `${cacheKey}.json`);

    try {
      const content = await readFile(filePath, 'utf8');
      const cached = JSON.parse(content) as DocumentEntity;

      logger.info(`Using cached document (...${cacheKey.slice(-8)})`);

      return cached;
    } catch {
      // cache miss — fall through to delegate
    }

    const result = await this.delegate.load(dto);

    try {
      await mkdir(this.cacheDirectory, { recursive: true });
      await writeFile(filePath, JSON.stringify(result), 'utf8');
      logger.info(`Cached document (...${cacheKey.slice(-8)})`);
    } catch (error) {
      logger.warn(
        { err: error },
        `Failed to cache document (...${cacheKey.slice(-8)})`,
      );
    }

    return result;
  }
}
