import type { ReviewReason } from '@carrot-fndn/shared/document-extractor';

import type { FieldValidationResult } from './cross-validation.helpers';

import {
  stubEntity,
  stubEntityWithAddress,
  stubMtrEntity,
  stubMtrEntityWithHighAddress,
} from './cross-validation.stubs';
import {
  compareDateField,
  compareEntity,
  compareStringField,
  type DayDifferenceWindow,
} from './field.comparators';

const mismatchReason = ({
  event,
  extracted,
}: {
  event: string;
  extracted: string;
}): ReviewReason => ({
  code: 'MISMATCH',
  description: `${extracted} vs ${event}`,
});

const notExtractedReason: ReviewReason = {
  code: 'NOT_EXTRACTED',
  description: 'Field not extracted',
};

const exactWindow: DayDifferenceWindow = { max: 0, min: 0 };

const dateWindows = {
  acceptedWindow: { max: 2, min: -1 },
  reviewWindow: { max: 5, min: -3 },
};

const highConfidenceDate = (parsed: string) => ({
  confidence: 'high' as const,
  parsed,
  rawMatch: parsed,
});

const toOutcome = ({ failReason }: FieldValidationResult) =>
  failReason === undefined ? 'review' : 'fail';

const onDateMismatch = ({
  daysDiff,
  event,
  extracted,
}: {
  daysDiff: number;
  event: string;
  extracted: string;
}): ReviewReason => ({
  code: 'DATE_MISMATCH',
  description: `${extracted} vs ${event} (${daysDiff} days)`,
});

const entityReasons = {
  name: {
    notExtractedReason: {
      code: 'NAME_NOT_EXTRACTED',
      description: 'Name not extracted',
    },
  },
  taxId: {
    mismatchReason: () => ({
      code: 'TAXID_MISMATCH',
      description: 'Tax ID mismatch',
    }),
    notExtractedReason: {
      code: 'TAXID_NOT_EXTRACTED',
      description: 'Tax ID not extracted',
    },
  },
};

const entityReasonsWithAddress = {
  ...entityReasons,
  address: {
    mismatchReason: ({ score }: { score: number }) => ({
      code: 'ADDRESS_MISMATCH',
      description: `Address similarity: ${(score * 100).toFixed(0)}%`,
    }),
    notExtractedReason: {
      code: 'ADDRESS_NOT_EXTRACTED',
      description: 'Address not extracted',
    },
  },
};

const stubEventAddress = (
  overrides?: Partial<{
    city: string;
    countryState: string;
    number: string;
    street: string;
    zipCode: string;
  }>,
) => ({
  city: 'Sao Paulo',
  countryCode: 'BR',
  countryState: 'SP',
  id: '1',
  latitude: 0,
  longitude: 0,
  neighborhood: '',
  number: '123',
  participantId: '1',
  piiSnapshotId: '1',
  street: 'Rua ABC',
  zipCode: '00000-000',
  ...overrides,
});

describe('cross-validation field comparators', () => {
  describe('compareStringField', () => {
    it('should return match when values are equal', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'ABC',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.debug.confidence).toBe('high');
      expect(result.debug.extracted).toBe('ABC');
      expect(result.debug.event).toBe('ABC');
      expect(result.validation).toEqual([]);
    });

    it('should return failReason when routing is fail and values mismatch', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason?.code).toBe('MISMATCH');
    });

    it('should return reviewReason with comparedFields when routing is review and values mismatch', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'review' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('MISMATCH');
      expect(result.validation[0]?.reviewReason?.comparedFields).toEqual([
        { event: 'XYZ', extracted: 'ABC', field: 'value' },
      ]);
    });

    it('should skip validation when confidence is low', () => {
      const result = compareStringField(
        { confidence: 'low', parsed: 'ABC', rawMatch: 'ABC' },
        'XYZ',
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should return null isMatch and not-extracted review when field is missing with notExtractedReason', () => {
      const result = compareStringField(undefined, 'ABC', {
        notExtractedReason,
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.debug.extracted).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return no validation when field is missing and no notExtractedReason', () => {
      const result = compareStringField(undefined, 'ABC', {
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.validation).toEqual([]);
    });

    it('should return no validation when event value is missing', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'ABC', rawMatch: 'ABC' },
        undefined,
        { onMismatch: mismatchReason, routing: 'fail' },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.debug.event).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should use custom compareFn', () => {
      const result = compareStringField(
        { confidence: 'high', parsed: 'abc-123', rawMatch: 'abc-123' },
        'ABC123',
        {
          compareFn: (a, b) =>
            a.replaceAll('-', '').toLowerCase() === b.toLowerCase(),
          onMismatch: mismatchReason,
          routing: 'review',
        },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should not emit notExtractedReason when field is missing and event is also missing', () => {
      const result = compareStringField(undefined, undefined, {
        notExtractedReason,
        onMismatch: mismatchReason,
        routing: 'fail',
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });
  });

  describe('compareDateField', () => {
    it('should return match when dates are the same', () => {
      const result = compareDateField(
        highConfidenceDate('2024-01-15'),
        '2024-01-15T00:00:00Z',
        { ...dateWindows, onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(true);
      expect(result.debug.daysDiff).toBe(0);
      expect(result.validation).toEqual([]);
    });

    it.each([
      { expected: 'none', extracted: '2024-01-17', signedDiff: 2 },
      { expected: 'review', extracted: '2024-01-18', signedDiff: 3 },
      { expected: 'review', extracted: '2024-01-20', signedDiff: 5 },
      { expected: 'fail', extracted: '2024-01-21', signedDiff: 6 },
      { expected: 'none', extracted: '2024-01-14', signedDiff: -1 },
      { expected: 'review', extracted: '2024-01-13', signedDiff: -2 },
      { expected: 'review', extracted: '2024-01-12', signedDiff: -3 },
      { expected: 'fail', extracted: '2024-01-11', signedDiff: -4 },
    ])(
      'should return $expected when the extracted date is $signedDiff day(s) from the event date',
      ({ expected, extracted, signedDiff }) => {
        const result = compareDateField(
          highConfidenceDate(extracted),
          '2024-01-15T00:00:00Z',
          { ...dateWindows, onMismatch: onDateMismatch },
        );

        expect(result.debug.daysDiff).toBe(Math.abs(signedDiff));
        expect(result.debug.isMatch).toBe(false);
        expect(result.validation.map((item) => toOutcome(item))).toEqual(
          expected === 'none' ? [] : [expected],
        );
      },
    );

    it('should return failReason for any mismatch when both windows are exact', () => {
      const result = compareDateField(
        highConfidenceDate('2024-01-01'),
        '2024-01-02T00:00:00Z',
        {
          acceptedWindow: exactWindow,
          onMismatch: onDateMismatch,
          reviewWindow: exactWindow,
        },
      );

      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.failReason).toMatchObject({
        code: 'DATE_MISMATCH',
        comparedFields: [{ field: 'date', similarity: '1 days' }],
      });
    });

    it('should skip validation when confidence is low', () => {
      const result = compareDateField(
        { confidence: 'low', parsed: '2024-01-01', rawMatch: '01/01/2024' },
        '2024-02-01T00:00:00Z',
        { ...dateWindows, onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBe(false);
      expect(result.validation).toEqual([]);
    });

    it('should return null isMatch when field is missing', () => {
      const result = compareDateField(undefined, '2024-01-01T00:00:00Z', {
        ...dateWindows,
        notExtractedReason,
        onMismatch: onDateMismatch,
      });

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toHaveLength(1);
      expect(result.validation[0]?.reviewReason?.code).toBe('NOT_EXTRACTED');
    });

    it('should return empty validation when event date is missing', () => {
      const result = compareDateField(
        highConfidenceDate('2024-01-01'),
        undefined,
        { ...dateWindows, onMismatch: onDateMismatch },
      );

      expect(result.debug.isMatch).toBeNull();
      expect(result.validation).toEqual([]);
    });
  });

  describe('compareEntity', () => {
    it('should return null debug and not-extracted reviews when entity is undefined', () => {
      const result = compareEntity(
        undefined,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug).toBeNull();
      expect(result.validation).toHaveLength(2);
      expect(result.validation[0]?.reviewReason?.code).toBe(
        'NAME_NOT_EXTRACTED',
      );
      expect(result.validation[1]?.reviewReason?.code).toBe(
        'TAXID_NOT_EXTRACTED',
      );
    });

    it('should not emit not-extracted when event values are also missing', () => {
      const result = compareEntity(
        undefined,
        undefined,
        undefined,
        entityReasons,
      );

      expect(result.debug).toBeNull();
      expect(result.validation).toEqual([]);
    });

    it('should return isMatch true when taxId matches', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Different Name'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.taxIdMatch).toBe(true);
    });

    it('should return failReason when taxId mismatches with high confidence', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Generator Co'],
        '22.222.222/0001-22',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(false);
      expect(result.debug?.taxIdMatch).toBe(false);

      const taxIdFail = result.validation.find(
        (v) => v.failReason?.code === 'TAXID_MISMATCH',
      );

      expect(taxIdFail).toBeDefined();
      expect(taxIdFail?.failReason?.comparedFields?.[0]?.field).toBe('taxId');
    });

    it('should not produce name mismatch validation (name is informational only)', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Completely Different Company Name XYZ'],
        undefined,
        entityReasons,
      );

      const nameReview = result.validation.find(
        (v) => v.reviewReason?.code === 'NAME_MISMATCH',
      );

      expect(nameReview).toBeUndefined();
      expect(result.debug?.nameSimilarity).toBeDefined();
    });

    it('should match if businessName matches but registered name does not', () => {
      const entity = stubEntity(
        'CONCESSIONARIA DO BLOCO SUL S.A.',
        '11.111.111/0001-11',
      );
      const result = compareEntity(
        entity,
        [
          'Aeroporto Internacional Afonso Pena',
          'CONCESSIONARIA DO BLOCO SUL S.A.',
        ],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.validation).toEqual([]);
    });

    it('should use best score from multiple names', () => {
      const entity = stubEntity('Generator Company Ltd', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Completely Wrong Name', 'Generator Company Ltd'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.nameSimilarity).toBe('100%');
    });

    it('should keep better score when first name matches best', () => {
      const entity = stubEntity('Generator Company Ltd', '11.111.111/0001-11');
      const result = compareEntity(
        entity,
        ['Generator Company Ltd', 'Completely Wrong Name'],
        '11.111.111/0001-11',
        entityReasons,
      );

      expect(result.debug?.isMatch).toBe(true);
      expect(result.debug?.nameSimilarity).toBe('100%');
    });

    it('should skip name validation when confidence is low', () => {
      const entity = {
        name: { confidence: 'low' as const, parsed: 'Gen Co', rawMatch: '' },
        taxId: {
          confidence: 'low' as const,
          parsed: '11.111.111/0001-11',
          rawMatch: '',
        },
      };
      const result = compareEntity(
        entity,
        ['Completely Different Company Name XYZ'],
        '99.999.999/0001-99',
        entityReasons,
      );

      expect(result.validation).toEqual([]);
    });

    it.each([
      { expectedReview: false, extractedMarker: '42+300' },
      { expectedReview: true, extractedMarker: '42+400' },
    ])(
      'should preserve receiver address review only for a different distance ($extractedMarker)',
      ({ expectedReview, extractedMarker }) => {
        const entity = stubMtrEntityWithHighAddress(
          'Fictional Receiver',
          '11.111.111/0001-11',
          `Rodovia Ficticia BR-999, Km ${extractedMarker}, S/N`,
          'Vila Inventada',
          'SP',
        );
        const result = compareEntity(
          entity,
          ['Fictional Receiver'],
          '22.222.222/0001-22',
          entityReasonsWithAddress,
          stubEventAddress({
            city: 'Vila Inventada',
            number: 'S/N',
            street: 'Rodovia Ficticia BR-999, Km 42,3',
          }),
        );

        expect(
          result.validation.some(
            (validation) =>
              validation.reviewReason?.code === 'ADDRESS_MISMATCH',
          ),
        ).toBe(expectedReview);
        expect(result.validation).toContainEqual(
          expect.objectContaining({
            failReason: expect.objectContaining({ code: 'TAXID_MISMATCH' }),
          }),
        );
      },
    );

    it.each([
      {
        eventStreet: 'ROD ZZ-999',
        extractedAddress: 'Rod ZZ 999 Km2, n° S/N',
      },
      {
        eventStreet: 'RODOVIA ZZ 999, 5000',
        extractedAddress: 'Rodovia ZZ 999, n° 5000 Km 05',
      },
    ])(
      'should match the generator address when the event street number is 0 and the document prints S/N ($eventStreet)',
      ({ eventStreet, extractedAddress }) => {
        const entity = stubMtrEntityWithHighAddress(
          'Fictional Generator',
          '11.111.111/0001-11',
          extractedAddress,
          'Vila Inventada',
          'RS',
        );
        const result = compareEntity(
          entity,
          ['Fictional Generator'],
          '11.111.111/0001-11',
          entityReasonsWithAddress,
          stubEventAddress({
            city: 'VILA INVENTADA',
            countryState: 'RS',
            number: '0',
            street: eventStreet,
          }),
        );

        expect(result.validation).toEqual([]);
        expect(result.debug?.address?.event).toBe(
          `${eventStreet}, VILA INVENTADA, RS`,
        );
      },
    );

    it.each([
      { label: 'blank state', state: '' },
      { label: 'stray non-UF token', state: 'Id' },
    ])(
      'should match the address when the document state is unusable ($label) and the event carries one',
      ({ state }) => {
        const entity = stubMtrEntityWithHighAddress(
          'Fictional Generator',
          '11.111.111/0001-11',
          'ROD ZZ 123, S/N- KM 110,4, n° S/N',
          'Vila Inventada',
          state,
        );
        const result = compareEntity(
          entity,
          ['Fictional Generator'],
          '11.111.111/0001-11',
          entityReasonsWithAddress,
          stubEventAddress({
            city: 'Vila Inventada',
            countryState: 'Rio Grande do Sul',
            number: 'S/N',
            street: 'ROD ZZ 123',
          }),
        );

        expect(result.validation).toEqual([]);
        expect(result.debug?.address?.event).toBe(
          'ROD ZZ 123, S/N, Vila Inventada',
        );
      },
    );

    it('should still fail a different city when the document state is blank', () => {
      const entity = stubMtrEntityWithHighAddress(
        'Fictional Generator',
        '11.111.111/0001-11',
        'ROD ZZ 123, S/N- KM 110,4, n° S/N',
        'Cidade Diferente',
        '',
      );
      const result = compareEntity(
        entity,
        ['Fictional Generator'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress({
          city: 'Vila Inventada',
          countryState: 'Rio Grande do Sul',
          number: 'S/N',
          street: 'ROD ZZ 123',
        }),
      );

      expect(result.validation).toHaveLength(1);
    });

    it('should include address in debug for entity with address fields', () => {
      const entity = stubEntityWithAddress(
        'Generator Co',
        '11.111.111/0001-11',
        'Rua ABC, 123',
        'Sao Paulo',
        'SP',
      );

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.debug?.address).toBeDefined();
      expect(result.debug?.address?.extracted).toContain('Sao Paulo');
    });

    it('should produce address review when address mismatches with high confidence', () => {
      const entity = stubMtrEntityWithHighAddress(
        'Generator Co',
        '11.111.111/0001-11',
        'Rua Completely Different',
        'Rio de Janeiro',
        'RJ',
      );

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress({
          city: 'Curitiba',
          countryState: 'PR',
          number: '456',
          street: 'Av Brasil',
          zipCode: '80000-000',
        }),
      );

      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeDefined();
    });

    it('should not produce address validation when entity has no address fields', () => {
      const entity = stubEntity('Generator Co', '11.111.111/0001-11');

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.debug?.address).toBeUndefined();
      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeUndefined();
    });

    it('should skip address validation when address confidence is low', () => {
      const entity = stubMtrEntity('Generator Co', '11.111.111/0001-11');

      const result = compareEntity(
        entity,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress({
          city: 'Curitiba',
          countryState: 'PR',
          number: '456',
          street: 'Av Brasil',
          zipCode: '80000-000',
        }),
      );

      const addressReview = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_MISMATCH',
      );

      expect(addressReview).toBeUndefined();
    });

    it('should include address not-extracted review when entity undefined and address present', () => {
      const result = compareEntity(
        undefined,
        ['Generator Co'],
        '11.111.111/0001-11',
        entityReasonsWithAddress,
        stubEventAddress(),
      );

      expect(result.validation).toHaveLength(3);
      const addressNotExtracted = result.validation.find(
        (v) => v.reviewReason?.code === 'ADDRESS_NOT_EXTRACTED',
      );

      expect(addressNotExtracted).toBeDefined();
    });
  });
});
