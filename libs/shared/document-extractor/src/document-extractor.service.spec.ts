import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  stubTextExtractionResult,
  type TextExtractionResult,
  type TextExtractor,
} from '@carrot-fndn/shared/text-extractor';

import type {
  BaseExtractedData,
  DocumentParser,
  ExtractionOutput,
} from './document-extractor.types';

import {
  createDocumentExtractor,
  DocumentExtractor,
} from './document-extractor.service';
import { clearRegistry, registerParser } from './layout-registry.helpers';

const STUB_TEXT = 'scale ticket content';

const buildMockOutput = (
  documentType: 'scaleTicket' | 'transportManifest' = 'scaleTicket',
): ExtractionOutput<BaseExtractedData> => ({
  data: {
    documentType,
    extractionConfidence: 'high',
    lowConfidenceFields: [],
    rawText: STUB_TEXT,
  },
  reviewReasons: [],
  reviewRequired: false,
});

class LowScoreParser implements DocumentParser<BaseExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'low-score-layout' as NonEmptyString;

  getMatchScore(): number {
    return 0.1;
  }

  parse(): ExtractionOutput<BaseExtractedData> {
    return buildMockOutput();
  }
}

class StubParser implements DocumentParser<BaseExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'stub-layout' as NonEmptyString;

  getMatchScore(): number {
    return 0.9;
  }

  parse(): ExtractionOutput<BaseExtractedData> {
    return buildMockOutput();
  }
}

class StubParser2 implements DocumentParser<BaseExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'stub-layout-2' as NonEmptyString;

  getMatchScore(): number {
    return 0.8;
  }

  parse(): ExtractionOutput<BaseExtractedData> {
    return buildMockOutput();
  }
}

describe('DocumentExtractor', () => {
  let mockTextExtractor: jest.Mocked<TextExtractor>;
  let extractor: DocumentExtractor;
  let stubExtractionResult: TextExtractionResult;

  beforeEach(() => {
    clearRegistry();
    registerParser('scaleTicket', 'stub-layout', StubParser);

    stubExtractionResult = stubTextExtractionResult(STUB_TEXT);

    mockTextExtractor = {
      extractText: jest.fn().mockResolvedValue(stubExtractionResult),
    };

    extractor = new DocumentExtractor(mockTextExtractor);
  });

  describe('textExtractionResult pass-through', () => {
    it('should not call textExtractor.extractText when textExtractionResult is provided', async () => {
      const preComputed = stubTextExtractionResult(STUB_TEXT);

      await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
          textExtractionResult: preComputed,
        },
      );

      expect(mockTextExtractor.extractText).not.toHaveBeenCalled();
    });

    it('should call textExtractor.extractText when textExtractionResult is not provided', async () => {
      await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
        },
      );

      expect(mockTextExtractor.extractText).toHaveBeenCalledWith({
        filePath: 'test.pdf',
      });
    });

    it('should include textExtractionResult in the output', async () => {
      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
        },
      );

      expect(result.textExtractionResult).toStrictEqual(stubExtractionResult);
    });
  });

  describe('auto-detect (no documentType)', () => {
    it('should auto-detect document type using selectBestParserGlobal', async () => {
      const result = await extractor.extract({ filePath: 'test.pdf' }, {});

      expect(result.layoutId).toBe('stub-layout');
      expect(result.textExtractionResult).toStrictEqual(stubExtractionResult);
    });

    it('should throw when no parser matches globally', async () => {
      clearRegistry();

      await expect(
        extractor.extract({ filePath: 'test.pdf' }, {}),
      ).rejects.toThrow('No matching parser found across any document type');
    });
  });

  describe('single layout', () => {
    it('should use the single layout parser', async () => {
      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
        },
      );

      expect(result.layoutId).toBe('stub-layout');
      expect(result.textExtractionResult).toStrictEqual(stubExtractionResult);
    });

    it('should throw when parser is not found for layout', async () => {
      await expect(
        extractor.extract(
          { filePath: 'test.pdf' },
          {
            documentType: 'scaleTicket',
            layouts: ['nonexistent-layout'] as NonEmptyString[],
          },
        ),
      ).rejects.toThrow(
        'No parser found for document type "scaleTicket" with layout "nonexistent-layout"',
      );
    });
  });

  describe('multiple layouts', () => {
    beforeEach(() => {
      registerParser('scaleTicket', 'stub-layout-2', StubParser2);
    });

    it('should select the best parser among multiple layouts', async () => {
      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout', 'stub-layout-2'] as NonEmptyString[],
        },
      );

      expect(result.layoutId).toBe('stub-layout');
      expect(result.textExtractionResult).toStrictEqual(stubExtractionResult);
    });

    it('should throw when no parser matches among layouts', async () => {
      clearRegistry();
      registerParser('scaleTicket', 'low-score-layout', LowScoreParser);
      registerParser('scaleTicket', 'stub-layout-2', LowScoreParser);

      await expect(
        extractor.extract(
          { filePath: 'test.pdf' },
          {
            documentType: 'scaleTicket',
            layouts: ['low-score-layout', 'stub-layout-2'] as NonEmptyString[],
          },
        ),
      ).rejects.toThrow(
        'No matching parser found for document type "scaleTicket" among layouts: low-score-layout, stub-layout-2',
      );
    });
  });

  describe('layout resolution from registry', () => {
    it('should resolve layouts from registry when none provided', async () => {
      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        { documentType: 'scaleTicket' },
      );

      expect(result.layoutId).toBe('stub-layout');
    });

    it('should throw when no layouts found for document type', async () => {
      await expect(
        extractor.extract(
          { filePath: 'test.pdf' },
          { documentType: 'transportManifest' },
        ),
      ).rejects.toThrow(
        'No layouts found for document type "transportManifest"',
      );
    });

    it('should resolve layouts from registry with empty layouts array', async () => {
      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        { documentType: 'scaleTicket', layouts: [] },
      );

      expect(result.layoutId).toBe('stub-layout');
    });
  });

  describe('accent normalization', () => {
    it('should normalize accents in block text', async () => {
      const accentedResult: TextExtractionResult = {
        blocks: [
          { blockType: 'LINE', id: 'b1', text: 'Resíduo' },
          { blockType: 'LINE', id: 'b2', text: 'Período' },
        ],
        rawText: 'Resíduo Período',
      };

      mockTextExtractor.extractText.mockResolvedValue(accentedResult);

      const result = await extractor.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
        },
      );

      expect(result.textExtractionResult?.blocks[0]?.text).toBe('Residuo');
      expect(result.textExtractionResult?.blocks[1]?.text).toBe('Periodo');
      expect(result.textExtractionResult?.rawText).toBe('Residuo Periodo');
    });
  });

  describe('createDocumentExtractor', () => {
    it('should create a DocumentExtractorService instance', async () => {
      const service = createDocumentExtractor(mockTextExtractor);

      const result = await service.extract(
        { filePath: 'test.pdf' },
        {
          documentType: 'scaleTicket',
          layouts: ['stub-layout'] as NonEmptyString[],
        },
      );

      expect(result.layoutId).toBe('stub-layout');
    });
  });
});
