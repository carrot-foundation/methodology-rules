import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import { PdfTextLayerExtractor } from './pdf-text-layer.extractor';
import { stubImageOnlyPdf, stubPdfWithLines } from './pdf-text-layer.stubs';

describe('PdfTextLayerExtractor', () => {
  const s3ClientMock = mockClient(S3Client);
  const extractor = new PdfTextLayerExtractor(new S3Client({}));
  let directory: string;

  const writePdf = async (bytes: Uint8Array): Promise<string> => {
    const filePath = path.join(directory, 'document.pdf');

    await writeFile(filePath, bytes);

    return filePath;
  };

  beforeEach(async () => {
    s3ClientMock.reset();
    directory = await mkdtemp(path.join(os.tmpdir(), 'pdf-text-layer-'));
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it('should return PAGE, LINE and WORD blocks in 0-1 page space at full confidence', async () => {
    const filePath = await writePdf(
      await stubPdfWithLines([{ text: 'First line' }, { text: 'Second' }]),
    );

    const result = await extractor.extractText({ filePath });

    expect(result.rawText).toBe('First line\nSecond');
    expect(
      result.blocks.map(({ blockType, text }) => [blockType, text]),
    ).toEqual([
      ['PAGE', undefined],
      ['LINE', 'First line'],
      ['LINE', 'Second'],
      ['WORD', 'First'],
      ['WORD', 'line'],
      ['WORD', 'Second'],
    ]);
    expect(result.blocks.every((block) => block.confidence === 100)).toBe(true);

    for (const { boundingBox } of result.blocks) {
      expect(boundingBox!.left).toBeGreaterThanOrEqual(0);
      expect(boundingBox!.left + boundingBox!.width).toBeLessThanOrEqual(1);
      expect(boundingBox!.top + boundingBox!.height).toBeLessThanOrEqual(1);
    }
  });

  it('should report each page with its own 0-1 coordinates, in page order', async () => {
    const source = await PDFDocument.load(
      await stubPdfWithLines([{ text: 'Same position' }]),
    );
    const document = await PDFDocument.create();

    for (const page of await document.copyPages(source, [0, 0])) {
      document.addPage(page);
    }

    const result = await extractor.extractText({
      filePath: await writePdf(await document.save()),
    });
    const lines = result.blocks.filter((block) => block.blockType === 'LINE');

    expect(
      result.blocks.filter((block) => block.blockType === 'PAGE'),
    ).toHaveLength(2);
    expect(lines.map((line) => line.boundingBox)).toEqual([
      lines[0]!.boundingBox,
      lines[0]!.boundingBox,
    ]);
  });

  it('should read the document from S3', async () => {
    s3ClientMock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(
        Readable.from([
          Buffer.from(await stubPdfWithLines([{ text: 'From S3' }])),
        ]),
      ),
    });

    const result = await extractor.extractText({
      s3Bucket: 'bucket',
      s3Key: 'key.pdf',
    });

    expect(result.rawText).toBe('From S3');
    expect(
      s3ClientMock.commandCalls(GetObjectCommand)[0]?.args[0].input,
    ).toEqual({
      Bucket: 'bucket',
      Key: 'key.pdf',
    });
  });

  it('should reject a PDF without visible text', async () => {
    await expect(
      extractor.extractText({
        filePath: await writePdf(await stubImageOnlyPdf()),
      }),
    ).rejects.toHaveProperty('name', 'ZodError');
  });

  it('should reject a file that is not a PDF', async () => {
    await expect(
      extractor.extractText({
        filePath: await writePdf(new Uint8Array([1, 2, 3])),
      }),
    ).rejects.toHaveProperty('name', 'InvalidPDFException');
  });

  it('should drop only the page that uses unmodelled content', async () => {
    const document = await PDFDocument.load(
      await stubPdfWithLines([{ text: 'Kept page' }]),
    );
    const font = await document.embedFont(StandardFonts.Helvetica);

    document
      .addPage()
      .drawText('Translucent page', { font, opacity: 0.5, x: 40, y: 700 });

    const result = await extractor.extractText({
      filePath: await writePdf(await document.save()),
    });

    expect(result.rawText).toBe('Kept page');
    expect(
      result.blocks.filter((block) => block.blockType === 'PAGE'),
    ).toHaveLength(2);
  });

  it('should reject an input without a file or S3 location', async () => {
    await expect(extractor.extractText({})).rejects.toThrow(
      'Either filePath or both s3Bucket and s3Key must be provided',
    );
  });
});
