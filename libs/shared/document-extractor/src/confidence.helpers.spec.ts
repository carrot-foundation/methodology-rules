import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ExtractedField } from './document-extractor.types';

import {
  buildExtractionOutput,
  calculateMatchScore,
  calculateOverallConfidence,
  collectLowConfidenceFields,
  collectMissingRequiredFields,
  createExtractedField,
  createFieldFromTextractConfidence,
  createHighConfidenceField,
  createLowConfidenceField,
  finalizeExtraction,
  isAboveMatchThreshold,
  MATCH_THRESHOLDS,
  mergeConfidence,
  textractConfidenceToExtraction,
} from './confidence.helpers';

describe('confidence.helpers', () => {
  describe('createExtractedField', () => {
    it('should create a field with the specified confidence', () => {
      const field = createExtractedField('test', 'high', 'raw');

      expect(field).toEqual({
        confidence: 'high',
        parsed: 'test',
        rawMatch: 'raw',
      });
    });
  });

  describe('createHighConfidenceField', () => {
    it('should create a high confidence field', () => {
      const field = createHighConfidenceField('test', 'raw');

      expect(field.confidence).toBe('high');
      expect(field.parsed).toBe('test');
      expect(field.rawMatch).toBe('raw');
    });
  });

  describe('createLowConfidenceField', () => {
    it('should create a low confidence field', () => {
      const field = createLowConfidenceField('test');

      expect(field.confidence).toBe('low');
      expect(field.parsed).toBe('test');
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should return high when all fields have high confidence', () => {
      const fields: ExtractedField<string>[] = [
        createHighConfidenceField('a'),
        createHighConfidenceField('b'),
      ];

      expect(calculateOverallConfidence(fields)).toBe('high');
    });

    it('should return low when any field has low confidence', () => {
      const fields: ExtractedField<string>[] = [
        createHighConfidenceField('a'),
        createLowConfidenceField('b'),
      ];

      expect(calculateOverallConfidence(fields)).toBe('low');
    });

    it('should return low when no fields are defined', () => {
      expect(calculateOverallConfidence([])).toBe('low');
    });

    it('should filter out undefined fields', () => {
      const fields: Array<ExtractedField<string> | undefined> = [
        createHighConfidenceField('a'),
        undefined,
        createHighConfidenceField('c'),
      ];

      expect(calculateOverallConfidence(fields)).toBe('high');
    });
  });

  describe('collectLowConfidenceFields', () => {
    it('should return field names with low confidence', () => {
      const data = {
        fieldA: createHighConfidenceField('a'),
        fieldB: createLowConfidenceField('b'),
        fieldC: createLowConfidenceField('c'),
      };

      const result = collectLowConfidenceFields(data, [
        'fieldA',
        'fieldB',
        'fieldC',
      ]);

      expect(result).toEqual(['fieldB', 'fieldC']);
    });

    it('should return empty array when all fields have high confidence', () => {
      const data = {
        fieldA: createHighConfidenceField('a'),
        fieldB: createHighConfidenceField('b'),
      };

      const result = collectLowConfidenceFields(data, ['fieldA', 'fieldB']);

      expect(result).toEqual([]);
    });

    it('should return dot-notation entries for entity groups with low confidence sub-fields', () => {
      const data = {
        generator: {
          address: createLowConfidenceField(''),
          city: createLowConfidenceField(''),
          name: createHighConfidenceField('EMPRESA LTDA'),
          state: createLowConfidenceField(''),
          taxId: createHighConfidenceField('12.345.678/0001-90'),
        },
        issueDate: createHighConfidenceField('01/01/2024'),
      };

      const result = collectLowConfidenceFields(data, [
        'issueDate',
        'generator',
      ]);

      expect(result).toEqual([
        'generator.address',
        'generator.city',
        'generator.state',
      ]);
    });

    it('should return empty array for entity groups with all high confidence', () => {
      const data = {
        recycler: {
          name: createHighConfidenceField('RECICLAGEM LTDA'),
          taxId: createHighConfidenceField('98.765.432/0001-10'),
        },
      };

      const result = collectLowConfidenceFields(data, ['recycler']);

      expect(result).toEqual([]);
    });
  });

  describe('collectMissingRequiredFields', () => {
    it('should return names of missing fields', () => {
      const data = {
        fieldA: createHighConfidenceField('a'),
      };

      const result = collectMissingRequiredFields(data, [
        'fieldA',
        'fieldB',
        'fieldC',
      ]);

      expect(result).toEqual(['fieldB', 'fieldC']);
    });

    it('should return empty array when all fields are present', () => {
      const data = {
        fieldA: createHighConfidenceField('a'),
        fieldB: createHighConfidenceField('b'),
      };

      const result = collectMissingRequiredFields(data, ['fieldA', 'fieldB']);

      expect(result).toEqual([]);
    });
  });

  describe('buildExtractionOutput', () => {
    it('should return reviewRequired false when no issues', () => {
      const data = {
        documentType: 'scaleTicket' as const,
        extractionConfidence: 'high' as const,
        lowConfidenceFields: [],
        missingRequiredFields: [],
        rawText: 'test' as const,
      };

      const result = buildExtractionOutput(data, 0.8);

      expect(result.reviewRequired).toBe(false);
      expect(result.reviewReasons).toEqual([]);
    });

    it('should return reviewRequired true with missing fields reason', () => {
      const data = {
        documentType: 'scaleTicket' as const,
        extractionConfidence: 'low' as const,
        lowConfidenceFields: [],
        missingRequiredFields: ['fieldA', 'fieldB'],
        rawText: 'test' as const,
      };

      const result = buildExtractionOutput(data, 0.8);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toContainEqual(
        expect.stringContaining('Missing required fields'),
      );
    });

    it('should return reviewRequired true with low confidence reason', () => {
      const data = {
        documentType: 'scaleTicket' as const,
        extractionConfidence: 'low' as const,
        lowConfidenceFields: ['fieldA'],
        missingRequiredFields: [],
        rawText: 'test' as const,
      };

      const result = buildExtractionOutput(data, 0.8);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toContainEqual(
        expect.stringContaining('Low confidence fields'),
      );
    });

    it('should return reviewRequired true when match score is below threshold', () => {
      const data = {
        documentType: 'scaleTicket' as const,
        extractionConfidence: 'high' as const,
        lowConfidenceFields: [],
        missingRequiredFields: [],
        rawText: 'test' as const,
      };

      const result = buildExtractionOutput(data, 0.4);

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toContainEqual(
        expect.stringContaining('Layout match score'),
      );
    });
  });

  describe('calculateMatchScore', () => {
    it('should return correct score based on matched patterns', () => {
      const text = 'hello world';
      const patterns = [/hello/, /world/, /foo/];

      const score = calculateMatchScore(text, patterns);

      expect(score).toBeCloseTo(0.67, 1);
    });

    it('should return 0 when no patterns provided', () => {
      const score = calculateMatchScore('text', []);

      expect(score).toBe(0);
    });

    it('should return 1 when all patterns match', () => {
      const text = 'hello world';
      const patterns = [/hello/, /world/];

      const score = calculateMatchScore(text, patterns);

      expect(score).toBe(1);
    });

    it('should return 0 when no patterns match', () => {
      const text = 'hello world';
      const patterns = [/foo/, /bar/];

      const score = calculateMatchScore(text, patterns);

      expect(score).toBe(0);
    });
  });

  describe('isAboveMatchThreshold', () => {
    it('should return true for scores above threshold', () => {
      expect(isAboveMatchThreshold(0.5)).toBe(true);
      expect(isAboveMatchThreshold(MATCH_THRESHOLDS.layout)).toBe(true);
    });

    it('should return false for scores below threshold', () => {
      expect(isAboveMatchThreshold(0.2)).toBe(false);
      expect(isAboveMatchThreshold(0)).toBe(false);
    });
  });

  describe('textractConfidenceToExtraction', () => {
    it('should return high when confidence is at or above threshold', () => {
      expect(
        textractConfidenceToExtraction(MATCH_THRESHOLDS.textractConfidence),
      ).toBe('high');
      expect(textractConfidenceToExtraction(99.5)).toBe('high');
    });

    it('should return low when confidence is below threshold', () => {
      expect(
        textractConfidenceToExtraction(MATCH_THRESHOLDS.textractConfidence - 1),
      ).toBe('low');
      expect(textractConfidenceToExtraction(50)).toBe('low');
    });
  });

  describe('createFieldFromTextractConfidence', () => {
    it('should create a high confidence field when textract confidence is high', () => {
      const field = createFieldFromTextractConfidence('value', 95, 'raw');

      expect(field).toEqual({
        confidence: 'high',
        parsed: 'value',
        rawMatch: 'raw',
      });
    });

    it('should create a low confidence field when textract confidence is low', () => {
      const field = createFieldFromTextractConfidence('value', 70);

      expect(field).toEqual({
        confidence: 'low',
        parsed: 'value',
      });
    });
  });

  describe('mergeConfidence', () => {
    it('should return high when both parsing and textract confidence are high', () => {
      expect(mergeConfidence('high', 95)).toBe('high');
    });

    it('should return low when parsing confidence is low', () => {
      expect(mergeConfidence('low', 99)).toBe('low');
    });

    it('should return low when textract confidence is below threshold', () => {
      expect(mergeConfidence('high', 70)).toBe('low');
    });

    it('should return low when both are low', () => {
      expect(mergeConfidence('low', 50)).toBe('low');
    });
  });

  describe('finalizeExtraction', () => {
    const rawText = 'some document text' as NonEmptyString;

    it('should build extraction output with no issues when all fields present and high confidence', () => {
      const partialData = {
        documentType: 'scaleTicket' as const,
        fieldA: createHighConfidenceField('a'),
        fieldB: createHighConfidenceField('b'),
        rawText,
      };

      const result = finalizeExtraction({
        allFields: ['fieldA', 'fieldB'],
        confidenceFields: [partialData.fieldA, partialData.fieldB],
        documentType: 'scaleTicket',
        matchScore: 0.8,
        partialData,
        rawText,
        requiredFields: ['fieldA'],
      });

      expect(result.data.missingRequiredFields).toEqual([]);
      expect(result.data.lowConfidenceFields).toEqual([]);
      expect(result.data.extractionConfidence).toBe('high');
      expect(result.reviewRequired).toBe(false);
    });

    it('should report missing required fields', () => {
      const partialData = {
        documentType: 'scaleTicket' as const,
        rawText,
      };

      const result = finalizeExtraction({
        allFields: ['fieldA'],
        confidenceFields: [],
        documentType: 'scaleTicket',
        matchScore: 0.8,
        partialData,
        rawText,
        requiredFields: ['fieldA'],
      });

      expect(result.data.missingRequiredFields).toEqual(['fieldA']);
      expect(result.reviewRequired).toBe(true);
    });

    it('should report low confidence fields', () => {
      const partialData = {
        documentType: 'scaleTicket' as const,
        fieldA: createLowConfidenceField('a'),
        rawText,
      };

      const result = finalizeExtraction({
        allFields: ['fieldA'],
        confidenceFields: [partialData.fieldA],
        documentType: 'scaleTicket',
        matchScore: 0.8,
        partialData,
        rawText,
        requiredFields: [],
      });

      expect(result.data.lowConfidenceFields).toEqual(['fieldA']);
      expect(result.data.extractionConfidence).toBe('low');
      expect(result.reviewRequired).toBe(true);
    });

    it('should flag review when match score is below threshold', () => {
      const partialData = {
        documentType: 'scaleTicket' as const,
        rawText,
      };

      const result = finalizeExtraction({
        allFields: [],
        confidenceFields: [],
        documentType: 'scaleTicket',
        matchScore: 0.4,
        partialData,
        rawText,
        requiredFields: [],
      });

      expect(result.reviewRequired).toBe(true);
      expect(result.reviewReasons).toContainEqual(
        expect.stringContaining('Layout match score'),
      );
    });
  });
});
