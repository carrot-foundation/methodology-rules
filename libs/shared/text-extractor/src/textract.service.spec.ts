import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  type Block,
  BlockType,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { logger } from '@carrot-fndn/shared/helpers';
import { sdkStreamMixin } from '@smithy/util-stream';
import { type AwsClientStub, mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'node:stream';

import type { TextExtractionResult } from './text-extractor.types';

import { splitPdfPages } from './pdf-splitter.helpers';
import { TextractService } from './textract.service';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
}));

jest.mock('./pdf-splitter.helpers', () => ({
  splitPdfPages: jest.fn(),
}));

const mockSplitPdfPages = jest.mocked(splitPdfPages);

describe('TextractService', () => {
  let textractClientMock: AwsClientStub<TextractClient>;
  let s3ClientMock: AwsClientStub<S3Client>;
  let service: TextractService;

  beforeEach(() => {
    textractClientMock = mockClient(TextractClient);
    s3ClientMock = mockClient(S3Client);
    service = new TextractService(new TextractClient({}), new S3Client({}));

    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    textractClientMock.reset();
    s3ClientMock.reset();
    jest.clearAllMocks();
  });

  it('should throw when input is invalid', async () => {
    await expect(service.extractText({})).rejects.toThrow(
      'Either filePath or both s3Bucket and s3Key must be provided',
    );
  });

  it('should construct with default clients when none are provided', async () => {
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
        Confidence: 99.5,
        Id: '1',
        Text: 'Hello',
      },
      {
        BlockType: BlockType.LINE,
        Confidence: 95.2,
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
        { blockType: 'LINE', confidence: 99.5, id: '1', text: 'Hello' },
        { blockType: 'LINE', confidence: 95.2, id: '2', text: 'World' },
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

  it('should preserve BoundingBox geometry when complete', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Geometry: {
          BoundingBox: {
            Height: 0.02,
            Left: 0.05,
            Top: 0.1,
            Width: 0.4,
          },
        },
        Id: '1',
        Text: 'With geometry',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({ filePath: 'file.pdf' });

    expect(result.blocks[0]!.boundingBox).toEqual({
      height: 0.02,
      left: 0.05,
      top: 0.1,
      width: 0.4,
    });
  });

  it('should omit boundingBox when BoundingBox is partial', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Geometry: {
          BoundingBox: {
            Left: 0.05,
            Top: 0.1,
          },
        },
        Id: '1',
        Text: 'Partial geometry',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({ filePath: 'file.pdf' });

    expect(result.blocks[0]!.boundingBox).toBeUndefined();
  });

  it('should omit boundingBox when Geometry is missing', async () => {
    const blocks: Block[] = [
      {
        BlockType: BlockType.LINE,
        Id: '1',
        Text: 'No geometry',
      },
    ];

    textractClientMock
      .on(DetectDocumentTextCommand)
      .resolves({ Blocks: blocks });

    const result = await service.extractText({ filePath: 'file.pdf' });

    expect(result.blocks[0]!.boundingBox).toBeUndefined();
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

  describe('page-splitting fallback on UnsupportedDocumentException', () => {
    const unsupportedError = new Error('Unsupported document');

    beforeEach(() => {
      unsupportedError.name = 'UnsupportedDocumentException';
      mockSplitPdfPages.mockResolvedValue([
        Buffer.from('page-1'),
        Buffer.from('page-2'),
      ]);
    });

    const page1Blocks: Block[] = [
      { BlockType: BlockType.LINE, Id: '1', Text: 'Page 1 line' },
    ];
    const page2Blocks: Block[] = [
      { BlockType: BlockType.LINE, Id: '2', Text: 'Page 2 line' },
    ];

    it('should fallback to page splitting for local file input', async () => {
      let callCount = 0;

      textractClientMock.on(DetectDocumentTextCommand).callsFake(() => {
        callCount++;

        if (callCount === 1) {
          throw unsupportedError;
        }

        return { Blocks: callCount === 2 ? page1Blocks : page2Blocks };
      });

      const result = await service.extractText({
        filePath: 'multi-page.pdf',
      });

      expect(result.rawText).toBe('Page 1 line\nPage 2 line');
      expect(result.blocks).toHaveLength(2);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('falling back to page splitting'),
      );
    });

    it('should fallback to page splitting for S3 input', async () => {
      let callCount = 0;

      textractClientMock.on(DetectDocumentTextCommand).callsFake(() => {
        callCount++;

        if (callCount === 1) {
          throw unsupportedError;
        }

        return { Blocks: callCount === 2 ? page1Blocks : page2Blocks };
      });

      const stream = sdkStreamMixin(
        Readable.from([Buffer.from('mock-pdf-bytes')]),
      );

      s3ClientMock.on(GetObjectCommand).resolves({ Body: stream });

      const result = await service.extractText({
        s3Bucket: 'bucket',
        s3Key: 'multi-page.pdf',
      });

      expect(result.rawText).toBe('Page 1 line\nPage 2 line');
      expect(result.blocks).toHaveLength(2);
      expect(s3ClientMock.commandCalls(GetObjectCommand)).toHaveLength(1);
    });

    it('should handle pages with no blocks', async () => {
      let callCount = 0;

      textractClientMock.on(DetectDocumentTextCommand).callsFake(() => {
        callCount++;

        if (callCount === 1) {
          throw unsupportedError;
        }

        return callCount === 2 ? { Blocks: page1Blocks } : {};
      });

      const result = await service.extractText({
        filePath: 'multi-page.pdf',
      });

      expect(result.rawText).toBe('Page 1 line');
      expect(result.blocks).toHaveLength(1);
    });

    it('should throw when S3 download returns empty body', async () => {
      textractClientMock
        .on(DetectDocumentTextCommand)
        .rejects(unsupportedError);
      s3ClientMock.on(GetObjectCommand).resolves({});

      await expect(
        service.extractText({ s3Bucket: 'bucket', s3Key: 'file.pdf' }),
      ).rejects.toThrow('Empty response body from S3');
    });

    it('should not fallback for other errors on local file', async () => {
      const otherError = new Error('Network error');

      textractClientMock.on(DetectDocumentTextCommand).rejects(otherError);

      await expect(
        service.extractText({ filePath: 'file.pdf' }),
      ).rejects.toThrow('Network error');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should not fallback for other errors on S3', async () => {
      const otherError = new Error('Access denied');

      textractClientMock.on(DetectDocumentTextCommand).rejects(otherError);

      await expect(
        service.extractText({ s3Bucket: 'bucket', s3Key: 'key' }),
      ).rejects.toThrow('Access denied');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
