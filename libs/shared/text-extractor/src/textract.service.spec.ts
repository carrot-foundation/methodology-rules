import {
  type Block,
  BlockType,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { logger } from '@carrot-fndn/shared/helpers';
import { type AwsClientStub, mockClient } from 'aws-sdk-client-mock';

import type { TextExtractionResult } from './types';

import { TextractService } from './textract.service';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
}));

describe('TextractService', () => {
  let textractClientMock: AwsClientStub<TextractClient>;
  let service: TextractService;

  beforeEach(() => {
    textractClientMock = mockClient(TextractClient);
    service = new TextractService(new TextractClient({}));

    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
  });

  afterEach(() => {
    textractClientMock.reset();
    jest.clearAllMocks();
  });

  it('should throw when input is invalid', async () => {
    await expect(service.extractText({})).rejects.toThrow(
      'Either filePath or both s3Bucket and s3Key must be provided',
    );
  });

  it('should construct with default TextractClient when none is provided', async () => {
    const defaultService = new TextractService();
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Text: 'Default client',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await defaultService.extractText({ filePath: 'file.pdf' });

    expect(result.rawText).toBe('Default client');
  });

  it('should extract text from local file', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Id: '1',
        Text: 'Hello',
      },
      {
        BlockType: BlockType.LINE,
        Id: '2',
        Text: 'World',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({
      filePath: 'file.pdf',
    });

    const expected: TextExtractionResult = {
      blocks: [
        { blockType: 'LINE', id: '1', text: 'Hello' },
        { blockType: 'LINE', id: '2', text: 'World' },
      ],
      rawText: 'Hello\nWorld' as TextExtractionResult['rawText'],
    };

    expect(result).toEqual(expected);
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should extract text from S3 object', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Id: '1',
        Text: 'From S3',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({
      s3Bucket: 'bucket',
      s3Key: 'key',
    });

    expect(result.rawText).toBe('From S3');
    expect(result.blocks).toHaveLength(1);
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should normalize S3 blocks without ids', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Id: '1',
        Text: 'First',
      },
      {
        BlockType: BlockType.LINE,
        Text: 'Second',
      } as Block,
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({
      s3Bucket: 'bucket',
      s3Key: 'key',
    });

    expect(result.blocks).toEqual([
      { blockType: 'LINE', id: '1', text: 'First' },
      { blockType: 'LINE', id: '', text: 'Second' },
    ]);
  });

  it('should throw when Textract returns no blocks', async () => {
    textractClientMock.on(DetectDocumentTextCommand).resolves({});

    await expect(service.extractText({ filePath: 'file.pdf' })).rejects.toThrow(
      'No blocks returned from Textract',
    );
  });

  it('should throw when Textract returns no blocks for S3 object', async () => {
    textractClientMock.on(DetectDocumentTextCommand).resolves({});

    await expect(
      service.extractText({ s3Bucket: 'bucket', s3Key: 'key' }),
    ).rejects.toThrow('No blocks returned from Textract');
  });

  it('should log and rethrow when Textract call fails for local file', async () => {
    const error = new Error('Textract error');

    textractClientMock.on(DetectDocumentTextCommand).rejects(error);

    await expect(service.extractText({ filePath: 'file.pdf' })).rejects.toThrow(
      error,
    );

    expect(logger.error).toHaveBeenCalled();
  });

  it('should log and rethrow when Textract call fails for S3 object', async () => {
    const error = new Error('Textract error');

    textractClientMock.on(DetectDocumentTextCommand).rejects(error);

    await expect(
      service.extractText({ s3Bucket: 'bucket', s3Key: 'key' }),
    ).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle blocks without text or blockType', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Text: 'Has text',
      },
      {
        BlockType: BlockType.LINE,
      } as Block,
      {
        Text: 'No type',
      } as Block,
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({
      filePath: 'another-file.pdf',
    });

    expect(result.blocks).toEqual([
      { blockType: 'LINE', id: '', text: 'Has text' },
      { blockType: 'LINE', id: '' },
      { id: '', text: 'No type' },
    ]);
  });

  it('should throw when no LINE blocks are returned', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.WORD,
        Id: '1',
        Text: 'Word-only block',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    await expect(
      service.extractText({
        filePath: 'no-line-blocks.pdf',
      }),
    ).rejects.toThrow('No LINE blocks returned from Textract');
  });
});
