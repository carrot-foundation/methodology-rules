import {
  type Block,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { logger } from '@carrot-fndn/shared/helpers';
import { readFileSync } from 'node:fs';

import type { TextractExtractionResult } from './types';

export interface TextractServiceInput {
  filePath?: string;
  s3Bucket?: string;
  s3Key?: string;
}

export class TextractService {
  private readonly textractClient: TextractClient;

  constructor(textractClient?: TextractClient) {
    this.textractClient = textractClient ?? new TextractClient();
  }

  async extractText(
    input: TextractServiceInput,
  ): Promise<TextractExtractionResult> {
    if (input.filePath) {
      return this.extractFromLocalFile(input.filePath);
    }

    if (input.s3Bucket && input.s3Key) {
      return this.extractFromS3(input.s3Bucket, input.s3Key);
    }

    throw new Error(
      'Either filePath or both s3Bucket and s3Key must be provided',
    );
  }

  private async extractFromLocalFile(
    filePath: string,
  ): Promise<TextractExtractionResult> {
    logger.debug(`Extracting text from local file: ${filePath}`);

    const fileBuffer = readFileSync(filePath);

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
      const blocks = response.Blocks.map((block) => {
        const result: { blockType?: string; id: string; text?: string } = {
          id: block.Id ?? '',
        };

        if (block.Text !== undefined) {
          result.text = block.Text;
        }

        if (block.BlockType !== undefined) {
          result.blockType = block.BlockType;
        }

        return result;
      });

      logger.debug(
        `Extracted ${blocks.length} blocks from local file: ${filePath}`,
      );

      return {
        blocks,
        rawText,
      };
    } catch (error) {
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
  ): Promise<TextractExtractionResult> {
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
      const blocks = response.Blocks.map((block) => {
        const result: { blockType?: string; id: string; text?: string } = {
          id: block.Id ?? '',
        };

        if (block.Text !== undefined) {
          result.text = block.Text;
        }

        if (block.BlockType !== undefined) {
          result.blockType = block.BlockType;
        }

        if (block.BlockType !== undefined) {
          result.blockType = block.BlockType;
        }

        return result;
      });

      logger.debug(
        `Extracted ${blocks.length} blocks from S3 object: s3://${bucket}/${key}`,
      );

      return {
        blocks,
        rawText,
      };
    } catch (error) {
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

  private extractRawText(blocks: Block[]): string {
    return blocks
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text ?? '')
      .join('\n');
  }
}
