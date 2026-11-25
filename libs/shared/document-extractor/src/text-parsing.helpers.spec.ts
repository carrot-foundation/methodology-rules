import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntity,
  createExtractedEntityWithAddress,
  extractAllStringFields,
  extractEntityFromSection,
  extractFieldWithLabelFallback,
  extractSection,
  extractStringField,
  isBrazilianStateCode,
  isLabelValueBlank,
  parseBrazilianNumber,
  stripAccents,
} from './text-parsing.helpers';

const line = (
  text: string,
  overrides: { confidence?: number; left?: number; top?: number } = {},
) => ({
  blockType: 'LINE',
  boundingBox: {
    height: 0.01,
    left: overrides.left ?? 0.5,
    top: overrides.top ?? 0.1,
    width: 0.2,
  },
  confidence: overrides.confidence ?? 99,
  id: `${text}-${String(overrides.top ?? 0.1)}`,
  text,
});

const labelLine = line('Data:');
const captionBelow = line('assinatura', { left: 0.52, top: 0.15 });

describe('text-parsing.helpers', () => {
  describe('stripAccents', () => {
    it('should strip Portuguese accents from text', () => {
      expect(stripAccents('Licença Ambiental')).toBe('Licenca Ambiental');
      expect(stripAccents('Município')).toBe('Municipio');
      expect(stripAccents('Razão Social')).toBe('Razao Social');
      expect(stripAccents('Período')).toBe('Periodo');
      expect(stripAccents('Resíduos')).toBe('Residuos');
      expect(stripAccents('Declaração')).toBe('Declaracao');
      expect(stripAccents('Responsável')).toBe('Responsavel');
      expect(stripAccents('através')).toBe('atraves');
    });

    it('should preserve text length for single-codepoint accented chars', () => {
      const input = 'São Paulo';
      const result = stripAccents(input);

      expect(result).toBe('Sao Paulo');
      expect(result.length).toBe(input.length);
    });

    it('should pass through text without accents unchanged', () => {
      const input = 'CNPJ: 12.345.678/0001-90';

      expect(stripAccents(input)).toBe(input);
    });

    it('should preserve special characters like degree and ordinal', () => {
      expect(stripAccents('n° 123')).toBe('n° 123');
      expect(stripAccents('nº 456')).toBe('nº 456');
    });
  });

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

    it('should return the same result on repeated calls with a global pattern', () => {
      const pattern = /Ticket:\s*(\d+)/g;
      const text = 'Ticket: 12345';

      const result1 = extractStringField(text, pattern);
      const result2 = extractStringField(text, pattern);

      expect(result2).toEqual(result1);
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

  describe('extractFieldWithLabelFallback', () => {
    const valuePattern = /Data\s*:\s*(\d{2}\/\d{2}\/\d{4})/;
    const labelPattern = /Data\s*:/i;

    it('should return high confidence field when value pattern matches', () => {
      const result = extractFieldWithLabelFallback(
        'Data: 15/03/2024',
        valuePattern,
        labelPattern,
      );

      expect(result?.confidence).toBe('high');
      expect(result?.parsed).toBe('15/03/2024');
      expect(result?.rawMatch).toBe('Data: 15/03/2024');
    });

    it('should return low confidence empty field when only label is present', () => {
      const result = extractFieldWithLabelFallback(
        'Data:\nOther content',
        valuePattern,
        labelPattern,
      );

      expect(result?.confidence).toBe('low');
      expect(result?.parsed).toBe('');
    });

    it('should return undefined when neither value nor label is found', () => {
      const result = extractFieldWithLabelFallback(
        'No relevant content',
        valuePattern,
        labelPattern,
      );

      expect(result).toBeUndefined();
    });

    it('should return a blank field when the label has nothing written next to or below it', () => {
      const result = extractFieldWithLabelFallback(
        'Data:\nassinatura',
        valuePattern,
        labelPattern,
        [labelLine, captionBelow],
      );

      expect(result).toEqual({ blank: true, confidence: 'low', parsed: '' });
    });

    it('should keep a low confidence field when a value sits below the label', () => {
      const result = extractFieldWithLabelFallback(
        'Data:\n15/O3/2024\nassinatura',
        valuePattern,
        labelPattern,
        [
          labelLine,
          line('15/O3/2024', { confidence: 55, top: 0.13 }),
          captionBelow,
        ],
      );

      expect(result).toEqual({ confidence: 'low', parsed: '' });
    });
  });

  describe('isLabelValueBlank', () => {
    const labelPattern = /Data\s*:/i;

    it('should be blank when nothing follows the label on its row or below it in its column', () => {
      expect(isLabelValueBlank([labelLine, captionBelow], labelPattern)).toBe(
        true,
      );
    });

    it('should not be blank when no printed line below bounds the label column', () => {
      expect(isLabelValueBlank([labelLine], labelPattern)).toBe(false);
    });

    it('should only look below the label on its own page', () => {
      const page = { blockType: 'PAGE', id: 'page' };
      const word = { ...captionBelow, blockType: 'WORD', id: 'word' };

      expect(
        isLabelValueBlank(
          [
            page,
            labelLine,
            line('1S/O3/2024', { confidence: 40, top: 0.14 }),
            word,
            page,
            line('Observacoes', { top: 0.12 }),
          ],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should not be blank when the label is read with low confidence', () => {
      expect(
        isLabelValueBlank(
          [{ ...labelLine, confidence: 60 }, captionBelow],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should not be blank when the label line carries more text', () => {
      expect(
        isLabelValueBlank(
          [{ ...labelLine, text: 'Data: 1S/O3' }, captionBelow],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should not be blank when a line follows the label on its row', () => {
      expect(
        isLabelValueBlank(
          [labelLine, line('15/03/2024', { left: 0.75, top: 0.1 })],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should not be blank when the first line below has digits', () => {
      expect(
        isLabelValueBlank(
          [labelLine, line('15/03/2024', { top: 0.13 }), captionBelow],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should not be blank when the first line below is read with low confidence', () => {
      expect(
        isLabelValueBlank(
          [labelLine, line('Joao', { confidence: 40, top: 0.13 })],
          labelPattern,
        ),
      ).toBe(false);
    });

    it('should ignore lines in other columns', () => {
      expect(
        isLabelValueBlank(
          [
            labelLine,
            line('Telefone: 1234', { left: 0.1, top: 0.13 }),
            captionBelow,
          ],
          labelPattern,
        ),
      ).toBe(true);
    });

    it('should not be blank when the label carries no confidence', () => {
      const withoutConfidence = {
        blockType: 'LINE',
        boundingBox: labelLine.boundingBox,
        id: 'label',
        text: 'Data:',
      };

      expect(
        isLabelValueBlank([withoutConfidence, captionBelow], labelPattern),
      ).toBe(false);
    });

    it('should not be blank when the label is not among the lines', () => {
      expect(isLabelValueBlank([captionBelow], labelPattern)).toBe(false);
    });
  });

  describe('createExtractedEntity', () => {
    it('should return high confidence fields when extraction is provided', () => {
      const extracted = {
        rawMatch: 'raw section text',
        value: {
          name: 'Company Name' as NonEmptyString,
          taxId: '12.345.678/0001-90' as NonEmptyString,
        },
      };

      const result = createExtractedEntity(extracted);

      expect(result.name.confidence).toBe('high');
      expect(result.name.parsed).toBe('Company Name');
      expect(result.name.rawMatch).toBe('raw section text');
      expect(result.taxId.confidence).toBe('high');
      expect(result.taxId.parsed).toBe('12.345.678/0001-90');
    });

    it('should keep the name and mark only the tax ID low when the tax ID is missing', () => {
      const result = createExtractedEntity({
        rawMatch: 'raw section text',
        value: { name: 'Company Name' as NonEmptyString },
      });

      expect(result.name).toMatchObject({
        confidence: 'high',
        parsed: 'Company Name',
      });
      expect(result.taxId).toMatchObject({ confidence: 'low', parsed: '' });
    });

    it('should return low confidence empty fields when extraction is undefined', () => {
      const result = createExtractedEntity(undefined);

      expect(result.name.confidence).toBe('low');
      expect(result.name.parsed).toBe('');
      expect(result.taxId.confidence).toBe('low');
      expect(result.taxId.parsed).toBe('');
    });
  });

  describe('createExtractedEntityWithAddress', () => {
    it('should return high confidence address fields when address is present', () => {
      const extracted = {
        rawMatch: 'raw section text',
        value: {
          address: 'Rua das Flores, 123',
          city: 'Curitiba',
          name: 'Company Name' as NonEmptyString,
          state: 'PR',
          taxId: '12.345.678/0001-90' as NonEmptyString,
        },
      };

      const result = createExtractedEntityWithAddress(extracted);

      expect(result.name.confidence).toBe('high');
      expect(result.address.confidence).toBe('high');
      expect(result.address.parsed).toBe('Rua das Flores, 123');
      expect(result.city.parsed).toBe('Curitiba');
      expect(result.state.parsed).toBe('PR');
    });

    it('should default city and state to empty when address is present but they are missing', () => {
      const extracted = {
        rawMatch: 'raw section text',
        value: {
          address: 'Rua das Flores, 123',
          name: 'Company Name' as NonEmptyString,
          taxId: '12.345.678/0001-90' as NonEmptyString,
        },
      };

      const result = createExtractedEntityWithAddress(extracted);

      expect(result.address.confidence).toBe('high');
      expect(result.address.parsed).toBe('Rua das Flores, 123');
      expect(result.city.confidence).toBe('high');
      expect(result.city.parsed).toBe('');
      expect(result.state.confidence).toBe('high');
      expect(result.state.parsed).toBe('');
    });

    it('should return low confidence empty address fields when address is missing', () => {
      const extracted = {
        rawMatch: 'raw section text',
        value: {
          name: 'Company Name' as NonEmptyString,
          taxId: '12.345.678/0001-90' as NonEmptyString,
        },
      };

      const result = createExtractedEntityWithAddress(extracted);

      expect(result.name.confidence).toBe('high');
      expect(result.address.confidence).toBe('low');
      expect(result.address.parsed).toBe('');
      expect(result.city.confidence).toBe('low');
      expect(result.state.confidence).toBe('low');
    });

    it('should return all low confidence fields when extraction is undefined', () => {
      const result = createExtractedEntityWithAddress(undefined);

      expect(result.name.confidence).toBe('low');
      expect(result.taxId.confidence).toBe('low');
      expect(result.address.confidence).toBe('low');
      expect(result.city.confidence).toBe('low');
      expect(result.state.confidence).toBe('low');
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

    it('should extract the name without a tax ID when the CNPJ label has no number', () => {
      const text =
        'Gerador\nRazao Social: Company ABC LTDA\nCPF/CNPJ:\nDestinador\nOther';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result?.value).toEqual({ name: 'Company ABC LTDA' });
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

    it('should return undefined when all cleaned names are too short', () => {
      const text = 'Gerador\nNome: AB\nCNPJ: 12.345.678/0001-90\nDestinador';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result).toBeUndefined();
    });

    it('should clean common prefixes from entity name', () => {
      const text =
        'Gerador\nRazao Social: Company XYZ\nCNPJ: 12.345.678/0001-90\nDestinador';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        cnpjPattern,
      );

      expect(result?.value.name).toBe('Company XYZ');
    });

    it('should extract entity with unformatted CNPJ (raw 14 digits)', () => {
      const unformattedCnpjPattern =
        // eslint-disable-next-line sonarjs/slow-regex
        /CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi;
      const text =
        'Gerador\nCompany ABC LTDA\nCNPJ: 28324667000169\nDestinador\nOther';

      const result = extractEntityFromSection(
        text,
        /^\s*Gerador\s*$/i,
        sectionPatterns,
        unformattedCnpjPattern,
      );

      expect(result).toBeDefined();
      expect(result?.value.name).toBe('Company ABC LTDA');
      expect(result?.value.taxId).toBe('28324667000169');
    });
  });

  describe('isBrazilianStateCode', () => {
    it.each([
      ['RS', true],
      [' sp ', true],
      ['Id', false],
      ['', false],
    ])('should return the UF check for %j', (value, expected) => {
      expect(isBrazilianStateCode(value)).toBe(expected);
    });
  });
});
