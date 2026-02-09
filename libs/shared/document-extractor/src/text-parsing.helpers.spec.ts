import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  entityFieldOrEmpty,
  extractAllStringFields,
  extractEntityFromSection,
  extractSection,
  extractStringField,
  parseBrazilianNumber,
} from './text-parsing.helpers';

describe('text-parsing.helpers', () => {
  describe('extractStringField', () => {
    it('should return rawMatch and trimmed value when pattern matches', () => {
      const result = extractStringField('Ticket: 12345', /Ticket:\s*(\d+)/);

      expect(result).toEqual({ rawMatch: 'Ticket: 12345', value: '12345' });
    });

    it('should trim whitespace from the captured value', () => {
      const result = extractStringField('Name:  hello world  ', /Name:\s*(.+)/);

      expect(result?.value).toBe('hello world');
    });

    it('should return undefined when pattern does not match', () => {
      const result = extractStringField('no match here', /Ticket:\s*(\d+)/);

      expect(result).toBeUndefined();
    });

    it('should return undefined when capture group is empty', () => {
      const result = extractStringField('Ticket:', /Ticket:\s*(\d+)?/);

      expect(result).toBeUndefined();
    });
  });

  describe('extractAllStringFields', () => {
    it('should return all matches for a global pattern', () => {
      const text = 'Item: apple\nItem: banana\nItem: cherry';
      const result = extractAllStringFields(text, /Item:\s*(.+)/g);

      expect(result).toEqual([
        { rawMatch: 'Item: apple', value: 'apple' },
        { rawMatch: 'Item: banana', value: 'banana' },
        { rawMatch: 'Item: cherry', value: 'cherry' },
      ]);
    });

    it('should add global flag when pattern is not global', () => {
      const text = 'Item: apple\nItem: banana';
      const result = extractAllStringFields(text, /Item:\s*(.+)/);

      expect(result).toEqual([
        { rawMatch: 'Item: apple', value: 'apple' },
        { rawMatch: 'Item: banana', value: 'banana' },
      ]);
    });

    it('should return empty array when no matches found', () => {
      const result = extractAllStringFields('no match here', /Item:\s*(.+)/);

      expect(result).toEqual([]);
    });

    it('should skip matches where capture group is empty', () => {
      const text = 'Item: | Item: banana';
      const result = extractAllStringFields(text, /Item: (\w+)?/g);

      expect(result).toEqual([{ rawMatch: 'Item: banana', value: 'banana' }]);
    });

    it('should trim whitespace from captured values', () => {
      const text = 'Name:  hello world  \nName:  foo bar  ';
      const result = extractAllStringFields(text, /Name:\s*(.+)/g);

      expect(result).toEqual([
        { rawMatch: 'Name:  hello world  ', value: 'hello world' },
        { rawMatch: 'Name:  foo bar  ', value: 'foo bar' },
      ]);
    });
  });

  describe('parseBrazilianNumber', () => {
    it('should parse Brazilian number format "1.234,56" to 1234.56', () => {
      expect(parseBrazilianNumber('1.234,56')).toBe(1234.56);
    });

    it('should parse number without thousands separator', () => {
      expect(parseBrazilianNumber('234,56')).toBe(234.56);
    });

    it('should parse integer with thousands separator', () => {
      expect(parseBrazilianNumber('1.000')).toBe(1000);
    });

    it('should parse simple integer', () => {
      expect(parseBrazilianNumber('42')).toBe(42);
    });

    it('should return undefined for non-numeric input', () => {
      expect(parseBrazilianNumber('abc')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseBrazilianNumber('')).toBeUndefined();
    });
  });

  describe('extractSection', () => {
    const allPatterns = [
      /^\s*Section A\s*$/i,
      /^\s*Section B\s*$/i,
      /^\s*Section C\s*$/i,
    ];

    it('should extract text between matching section and next section', () => {
      const text = 'Section A\nLine 1\nLine 2\nSection B\nLine 3';

      const result = extractSection(text, /^\s*Section A\s*$/i, allPatterns);

      expect(result).toBe('Section A\nLine 1\nLine 2');
    });

    it('should return undefined when section is not found', () => {
      const text = 'Section A\nLine 1';

      const result = extractSection(text, /^\s*Section D\s*$/i, allPatterns);

      expect(result).toBeUndefined();
    });

    it('should include all lines until end when no next section exists', () => {
      const text = 'Section C\nLine 1\nLine 2\nLine 3';

      const result = extractSection(text, /^\s*Section C\s*$/i, allPatterns);

      expect(result).toBe('Section C\nLine 1\nLine 2\nLine 3');
    });

    it('should handle multiple sections correctly', () => {
      const text =
        'Section A\nA content\nSection B\nB content\nSection C\nC content';

      expect(extractSection(text, /^\s*Section A\s*$/i, allPatterns)).toBe(
        'Section A\nA content',
      );
      expect(extractSection(text, /^\s*Section B\s*$/i, allPatterns)).toBe(
        'Section B\nB content',
      );
      expect(extractSection(text, /^\s*Section C\s*$/i, allPatterns)).toBe(
        'Section C\nC content',
      );
    });
  });

  describe('entityFieldOrEmpty', () => {
    it('should return high confidence field when extraction is provided', () => {
      const extracted = {
        rawMatch: 'raw section text',
        value: {
          name: 'Company Name' as NonEmptyString,
          taxId: '12.345.678/0001-90' as NonEmptyString,
        },
      };

      const result = entityFieldOrEmpty(extracted);

      expect(result.confidence).toBe('high');
      expect(result.parsed).toEqual(extracted.value);
      expect(result.rawMatch).toBe('raw section text');
    });

    it('should return low confidence empty field when extraction is undefined', () => {
      const result = entityFieldOrEmpty(undefined);

      expect(result.confidence).toBe('low');
      expect(result.parsed).toEqual({
        name: '',
        taxId: '',
      });
    });
  });

  describe('extractEntityFromSection', () => {
    const sectionPatterns = [/^\s*Gerador\s*$/i, /^\s*Destinador\s*$/i];
    // eslint-disable-next-line sonarjs/slow-regex
    const cnpjPattern = /CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/gi;

    it('should extract entity with name and CNPJ from a section', () => {
      const text =
        'Gerador\nCompany ABC LTDA\nCNPJ: 12.345.678/0001-90\nDestinador\nOther';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeDefined();
      expect(result?.value.name).toBe('Company ABC LTDA');
      expect(result?.value.taxId).toBe('12.345.678/0001-90');
    });

    it('should return undefined when CNPJ is not found in section', () => {
      const text =
        'Gerador\nCompany ABC LTDA\nNo tax id here\nDestinador\nOther';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when no valid name is found', () => {
      const text = 'Gerador\nCNPJ: 12.345.678/0001-90\nDestinador';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when section is not found', () => {
      const text = 'Destinador\nCompany\nCNPJ: 12.345.678/0001-90';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeUndefined();
    });

    it('should skip short and numeric-only lines when searching for name', () => {
      const text =
        'Gerador\nAB\n123\n456\nCompany Valid Name\nCNPJ: 12.345.678/0001-90\nDestinador';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeDefined();
      expect(result?.value.name).toBe('Company Valid Name');
    });

    it('should clean common prefixes from entity name', () => {
      const text =
        'Gerador\nRazão Social: Company XYZ\nCNPJ: 12.345.678/0001-90\nDestinador';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result?.value.name).toBe('Company XYZ');
    });
  });
});
