import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  type Block,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { logger } from '@carrot-fndn/shared/helpers';
import { readFile } from 'node:fs/promises';

import type {
  TextExtractionInput,
  TextExtractionResult,
} from './text-extractor.types';

import { splitPdfPages } from './pdf-splitter.helpers';
import {
  assertTextExtractionInput,
  assertTextExtractionResultRawText,
} from './text-extractor.typia';

const isUnsupportedDocumentException = (error: unknown): boolean => {
  /* istanbul ignore next -- defensive: AWS SDK always throws Error objects */
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (error as { name?: string }).name === 'UnsupportedDocumentException';
};

export class TextractService {
  private readonly s3Client: S3Client;
  private readonly textractClient: TextractClient;

  constructor(textractClient?: TextractClient, s3Client?: S3Client) {
    this.textractClient = textractClient ?? new TextractClient();
    this.s3Client = s3Client ?? new S3Client();
  }

  async extractText(input: TextExtractionInput): Promise<TextExtractionResult> {
    assertTextExtractionInput(input);

    const startTime = Date.now();
    const source = input.filePath ?? `s3://${input.s3Bucket}/${input.s3Key}`;

    try {
      if (input.filePath) {
        return await this.extractFromLocalFile(input.filePath);
      }

      if (input.s3Bucket && input.s3Key) {
        return await this.extractFromS3(input.s3Bucket, input.s3Key);
      }

      throw new Error(
        'Either filePath or both s3Bucket and s3Key must be provided',
      );
    } finally {
      const durationMs = Date.now() - startTime;

      logger.info(
        `Text extraction completed in ${(durationMs / 1000).toFixed(1)}s for ${source}`,
      );
    }
  }

  private async downloadFromS3(
    bucket: string,
    key: string,
  ): Promise<Uint8Array> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Empty response body from S3 for s3://${bucket}/${key}`);
    }

    return response.Body.transformToByteArray();
  }

  private async extractFromLocalFile(
    filePath: string,
  ): Promise<TextExtractionResult> {
    logger.debug(`Extracting text from local file: ${filePath}`);

    const fileBuffer = await readFile(filePath);

    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: fileBuffer,
      },
    });

    try {
      const response = await this.textractClient.send(command);

      if (!response.Blocks) {
        throw new Error('No blocks returned from Textract');
      }

      const rawText = this.extractRawText(response.Blocks);
      const blocks = this.mapBlocks(response.Blocks);

      logger.debug(
        `Extracted ${blocks.length} blocks from local file: ${filePath}`,
      );

      return {
        blocks,
        rawText,
      };
    } catch (error) {
      if (isUnsupportedDocumentException(error)) {
        logger.info(
          `Sync extraction unsupported for ${filePath}, falling back to page splitting`,
        );

        return this.extractWithPageSplitting(fileBuffer);
      }

      logger.error(
        {
          err: error,
          filePath,
        },
        'Failed to extract text from local file',
      );
      throw error;
    }
  }

  private async extractFromS3(
    bucket: string,
    key: string,
  ): Promise<TextExtractionResult> {
    logger.debug(`Extracting text from S3: s3://${bucket}/${key}`);

    const command = new DetectDocumentTextCommand({
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
    });

    try {
      const response = await this.textractClient.send(command);

      if (!response.Blocks) {
        throw new Error('No blocks returned from Textract');
      }

      const rawText = this.extractRawText(response.Blocks);
      const blocks = this.mapBlocks(response.Blocks);

      logger.debug(
        `Extracted ${blocks.length} blocks from S3 object: s3://${bucket}/${key}`,
      );

      return {
        blocks,
        rawText,
      };
    } catch (error) {
      if (isUnsupportedDocumentException(error)) {
        logger.info(
          `Sync extraction unsupported for s3://${bucket}/${key}, falling back to page splitting`,
        );

        const pdfBytes = await this.downloadFromS3(bucket, key);

        return this.extractWithPageSplitting(pdfBytes);
      }

      logger.error(
        {
          bucket,
          err: error,
          key,
        },
        'Failed to extract text from S3 object',
      );
      throw error;
    }
  }

  private extractRawText(blocks: Block[]): TextExtractionResult['rawText'] {
    const text = blocks
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text ?? '')
      .join('\n')
      .trim();

    if (text.length === 0) {
      throw new Error('No LINE blocks returned from Textract');
    }

    return assertTextExtractionResultRawText(text);
  }

  private async extractWithPageSplitting(
    pdfBytes: Uint8Array,
  ): Promise<TextExtractionResult> {
    const pages = await splitPdfPages(pdfBytes);

    const pageResults = await Promise.all(
      pages.map(async (pageBytes, index) => {
        logger.debug(`Extracting text from page ${index + 1}/${pages.length}`);

        const command = new DetectDocumentTextCommand({
          Document: { Bytes: pageBytes },
        });

        const response = await this.textractClient.send(command);

        return response.Blocks ?? [];
      }),
    );

    const allBlocks = pageResults.flat();

    logger.info(
      `Extracted ${allBlocks.length} blocks from ${pages.length} pages using parallel sync`,
    );

    const rawText = this.extractRawText(allBlocks);
    const blocks = this.mapBlocks(allBlocks);

    return { blocks, rawText };
  }

  private mapBlocks(blocks: Block[]): TextExtractionResult['blocks'] {
    return blocks.map((block) => {
      const result: TextExtractionResult['blocks'][number] = {
        id: block.Id ?? '',
      };

      if (block.Text !== undefined) {
        result.text = block.Text;
      }

      if (block.BlockType !== undefined) {
        result.blockType = block.BlockType;
      }

      if (block.Confidence !== undefined) {
        result.confidence = block.Confidence;
      }

      const bb = block.Geometry?.BoundingBox;

      if (
        bb?.Left !== undefined &&
        bb.Top !== undefined &&
        bb.Width !== undefined &&
        bb.Height !== undefined
      ) {
        result.boundingBox = {
          height: bb.Height,
          left: bb.Left,
          top: bb.Top,
          width: bb.Width,
        };
      }

      return result;
    });
  }
}
