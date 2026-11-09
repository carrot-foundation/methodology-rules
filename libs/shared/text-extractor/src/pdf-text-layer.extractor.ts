import type { S3Client } from '@aws-sdk/client-s3';

import { readFile } from 'node:fs/promises';
import { getResolvedPDFJS } from 'unpdf';

import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from './text-extractor.types';

import {
  extractVisibleWords,
  type VisibleWord,
} from './pdf-visible-text.helpers';
import { downloadS3Object } from './s3-object.helpers';
import {
  clusterBlocksByY,
  groupWordsIntoCells,
} from './table-extraction.helpers';
import {
  assertTextExtractionInput,
  assertTextExtractionResultRawText,
} from './text-extractor.validators';

type TextBlock = TextExtractionResult['blocks'][number];

const TEXT_LAYER_CONFIDENCE = 100;

const readDocumentBytes = async (
  input: TextExtractionInput,
  s3Client: S3Client,
): Promise<Uint8Array> => {
  if (input.filePath) {
    return new Uint8Array(await readFile(input.filePath));
  }

  if (input.s3Bucket && input.s3Key) {
    return downloadS3Object(s3Client, input.s3Bucket, input.s3Key);
  }

  throw new Error(
    'Either filePath or both s3Bucket and s3Key must be provided',
  );
};

const mergeBoxes = (
  blocks: readonly TextBlock[],
): NonNullable<TextBlock['boundingBox']> => {
  const left = Math.min(...blocks.map((block) => block.boundingBox!.left));
  const top = Math.min(...blocks.map((block) => block.boundingBox!.top));
  const right = Math.max(
    ...blocks.map(
      (block) => block.boundingBox!.left + block.boundingBox!.width,
    ),
  );
  const bottom = Math.max(
    ...blocks.map(
      (block) => block.boundingBox!.top + block.boundingBox!.height,
    ),
  );

  return { height: bottom - top, left, top, width: right - left };
};

const toPageBlocks = (
  words: readonly VisibleWord[],
  pageNumber: number,
): TextBlock[] => {
  const id = (kind: string, index: number) =>
    `text-layer-${String(pageNumber)}-${kind}-${String(index)}`;

  const wordBlocks: TextBlock[] = words
    .map(({ height, left, text, top, width }, index) => ({
      blockType: 'WORD',
      boundingBox: { height, left, top, width },
      confidence: TEXT_LAYER_CONFIDENCE,
      id: id('word', index),
      text,
    }))
    .sort((a, b) => a.boundingBox.top - b.boundingBox.top);

  const lineBlocks = clusterBlocksByY(wordBlocks).flatMap((row) => {
    const rowWords = row.toSorted(
      (a, b) => a.boundingBox!.left - b.boundingBox!.left,
    );

    return groupWordsIntoCells(rowWords, mergeBoxes(rowWords).height);
  });

  return [
    {
      blockType: 'PAGE',
      boundingBox: { height: 1, left: 0, top: 0, width: 1 },
      confidence: TEXT_LAYER_CONFIDENCE,
      id: id('page', 0),
    },
    ...lineBlocks.map((cell, index) => ({
      blockType: 'LINE',
      boundingBox: mergeBoxes(cell),
      confidence: TEXT_LAYER_CONFIDENCE,
      id: id('line', index),
      text: cell.map((word) => word.text).join(' '),
    })),
    ...wordBlocks,
  ];
};

export class PdfTextLayerExtractor implements TextExtractor {
  constructor(private readonly s3Client: S3Client) {}

  async extractText(input: TextExtractionInput): Promise<TextExtractionResult> {
    assertTextExtractionInput(input);

    const { getDocument, VerbosityLevel } = await getResolvedPDFJS();
    const loadingTask = getDocument({
      data: await readDocumentBytes(input, this.s3Client),
      verbosity: VerbosityLevel.ERRORS,
    });

    try {
      const document = await loadingTask.promise;
      const blocks: TextBlock[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const words = await extractVisibleWords(
          await document.getPage(pageNumber),
        );

        blocks.push(...toPageBlocks(words, pageNumber));
      }

      const rawText = blocks
        .filter((block) => block.blockType === 'LINE')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return { blocks, rawText: assertTextExtractionResultRawText(rawText) };
    } finally {
      await loadingTask.destroy();
    }
  }
}
