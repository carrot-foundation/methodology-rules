import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  stubTextExtractionResult,
  type TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';

import type {
  BaseExtractedData,
  DocumentParser,
  DocumentType,
  ExtractionOutput,
} from './document-extractor.types';

import {
  clearRegistry,
  getAllParsers,
  getParser,
  getParsersByDocumentType,
  getRegisteredLayouts,
  registerParser,
  selectBestParser,
  selectBestParserGlobal,
} from './layout-registry.helpers';

const buildMockExtractionOutput = (
  documentType: DocumentType,
  rawText: NonEmptyString,
): ExtractionOutput<BaseExtractedData> => ({
  data: {
    documentType,
    extractionConfidence: 'high',
    lowConfidenceFields: [],
    rawText,
  },
  reviewReasons: [],
  reviewRequired: false,
});

class MockScaleTicketLayout2Parser
  implements DocumentParser<BaseExtractedData>
{
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'layout-2' as NonEmptyString;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return extractionResult.rawText.includes('layout2') ? 0.95 : 0.1;
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<BaseExtractedData> {
    return buildMockExtractionOutput('scaleTicket', extractionResult.rawText);
  }
}

class MockScaleTicketParser implements DocumentParser<BaseExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'mock-layout' as NonEmptyString;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return extractionResult.rawText.includes('scale') ? 0.8 : 0.1;
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<BaseExtractedData> {
    return buildMockExtractionOutput('scaleTicket', extractionResult.rawText);
  }
}

class MockTransportManifestParser implements DocumentParser<BaseExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mock-transport-layout' as NonEmptyString;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return extractionResult.rawText.includes('MTR') ? 0.9 : 0.1;
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<BaseExtractedData> {
    return buildMockExtractionOutput(
      'transportManifest',
      extractionResult.rawText,
    );
  }
}

describe('layout-registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerParser', () => {
    it('should register a parser', () => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);

      const parser = getParser({
        documentType: 'scaleTicket',
        layoutId: 'mock-layout',
      });

      expect(parser).toBeDefined();
      expect(parser?.documentType).toBe('scaleTicket');
      expect(parser?.layoutId).toBe('mock-layout');
    });

    it('should replace existing parser with same documentType and layoutId', () => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);
      registerParser(
        'scaleTicket',
        'mock-layout',
        MockScaleTicketLayout2Parser,
      );

      const parser = getParser({
        documentType: 'scaleTicket',
        layoutId: 'mock-layout',
      });

      expect(parser).toBeInstanceOf(MockScaleTicketLayout2Parser);
      expect(
        getRegisteredLayouts().filter(
          (l) =>
            l.documentType === 'scaleTicket' && l.layoutId === 'mock-layout',
        ),
      ).toHaveLength(1);
    });
  });

  describe('getParser', () => {
    it('should return undefined when no parser is registered', () => {
      const parser = getParser({
        documentType: 'scaleTicket',
        layoutId: 'unknown',
      });

      expect(parser).toBeUndefined();
    });

    it('should return the registered parser', () => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);

      const parser = getParser({
        documentType: 'scaleTicket',
        layoutId: 'mock-layout',
      });

      expect(parser).toBeDefined();
    });
  });

  describe('getParsersByDocumentType', () => {
    it('should return all parsers for a document type', () => {
      registerParser('scaleTicket', 'layout-1', MockScaleTicketParser);
      registerParser('scaleTicket', 'layout-2', MockScaleTicketParser);
      registerParser(
        'transportManifest',
        'transport-layout',
        MockTransportManifestParser,
      );

      const parsers = getParsersByDocumentType('scaleTicket');

      expect(parsers).toHaveLength(2);
      expect(parsers.every((p) => p.documentType === 'scaleTicket')).toBe(true);
    });

    it('should return empty array when no parsers registered', () => {
      const parsers = getParsersByDocumentType('scaleTicket');

      expect(parsers).toEqual([]);
    });
  });

  describe('getAllParsers', () => {
    it('should return all registered parsers', () => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);
      registerParser(
        'transportManifest',
        'mock-transport-layout',
        MockTransportManifestParser,
      );

      const parsers = getAllParsers();

      expect(parsers).toHaveLength(2);
    });
  });

  describe('selectBestParser', () => {
    beforeEach(() => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);
      registerParser('scaleTicket', 'layout-2', MockScaleTicketLayout2Parser);
      registerParser(
        'transportManifest',
        'mock-transport-layout',
        MockTransportManifestParser,
      );
    });

    it('should select the best matching parser from provided layouts', () => {
      const result = selectBestParser(
        stubTextExtractionResult('This is a scale ticket'),
        'scaleTicket',
        ['mock-layout', 'layout-2'],
      );

      expect(result).toBeDefined();
      expect(result?.parser.documentType).toBe('scaleTicket');
      expect(result?.parser.layoutId).toBe('mock-layout');
      expect(result?.score).toBe(0.8);
    });

    it('should select better scoring layout when both match', () => {
      const result = selectBestParser(
        stubTextExtractionResult('This is a scale ticket layout2'),
        'scaleTicket',
        ['mock-layout', 'layout-2'],
      );

      expect(result).toBeDefined();
      expect(result?.parser.layoutId).toBe('layout-2');
      expect(result?.score).toBe(0.95);
    });

    it('should return undefined when no layouts match above threshold', () => {
      const result = selectBestParser(
        stubTextExtractionResult('random text'),
        'scaleTicket',
        ['mock-layout', 'layout-2'],
      );

      expect(result).toBeUndefined();
    });

    it('should skip unregistered layouts', () => {
      const result = selectBestParser(
        stubTextExtractionResult('This is a scale ticket'),
        'scaleTicket',
        ['unknown-layout', 'mock-layout'],
      );

      expect(result).toBeDefined();
      expect(result?.parser.layoutId).toBe('mock-layout');
    });

    it('should return undefined when all layouts are unregistered', () => {
      const result = selectBestParser(
        stubTextExtractionResult('This is a scale ticket'),
        'scaleTicket',
        ['unknown-1', 'unknown-2'],
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectBestParserGlobal', () => {
    beforeEach(() => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);
      registerParser('scaleTicket', 'layout-2', MockScaleTicketLayout2Parser);
      registerParser(
        'transportManifest',
        'mock-transport-layout',
        MockTransportManifestParser,
      );
    });

    it('should select the best parser across all document types', () => {
      const result = selectBestParserGlobal(
        stubTextExtractionResult('This contains MTR data'),
      );

      expect(result).toBeDefined();
      expect(result?.parser.documentType).toBe('transportManifest');
      expect(result?.parser.layoutId).toBe('mock-transport-layout');
      expect(result?.score).toBe(0.9);
    });

    it('should select the highest scoring parser when multiple types match', () => {
      const result = selectBestParserGlobal(
        stubTextExtractionResult('This has scale and layout2 text'),
      );

      expect(result).toBeDefined();
      expect(result?.parser.layoutId).toBe('layout-2');
      expect(result?.score).toBe(0.95);
    });

    it('should return undefined when no parser matches above threshold', () => {
      const result = selectBestParserGlobal(
        stubTextExtractionResult('random text with no keywords'),
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when no parsers are registered', () => {
      clearRegistry();

      const result = selectBestParserGlobal(
        stubTextExtractionResult('This contains MTR data'),
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getRegisteredLayouts', () => {
    it('should return all registered layouts', () => {
      registerParser('scaleTicket', 'layout-1', MockScaleTicketParser);
      registerParser(
        'transportManifest',
        'transport-layout',
        MockTransportManifestParser,
      );

      const layouts = getRegisteredLayouts();

      expect(layouts).toEqual([
        { documentType: 'scaleTicket', layoutId: 'layout-1' },
        { documentType: 'transportManifest', layoutId: 'transport-layout' },
      ]);
    });
  });

  describe('clearRegistry', () => {
    it('should clear all registered parsers', () => {
      registerParser('scaleTicket', 'mock-layout', MockScaleTicketParser);

      clearRegistry();

      expect(getAllParsers()).toEqual([]);
    });
  });
});
