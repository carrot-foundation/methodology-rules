import {
  type MetadataAttributeParameter,
  stubBoldMassIDPickUpEvent,
  stubBoldOrganicWasteCarbonCharacterizationEvent,
  stubDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldBaseline,
  type BoldDocument,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  buildOthersIfOrganicAuditDetails,
  buildOthersIfOrganicContext,
  calculateOthersIfOrganicFactor,
  getGeneratorCarbonCharacterization,
  getOthersIfOrganicContextFromMassIdDocument,
  isCarbonCharacterizationValid,
  resolveCanonicalLocalWasteClassificationId,
  resolveOthersIfOrganicCarbonFraction,
} from './prevented-emissions.others-organic.helpers';

const {
  CARBON_ANALYSIS_DATE,
  CARBON_FRACTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  MOISTURE_FRACTION,
} = BoldAttributeName;

const buildWasteGeneratorAccreditationDocument = (
  metadataAttributes: MetadataAttributeParameter[],
): BoldDocument =>
  stubDocument({
    externalEvents: [
      stubBoldOrganicWasteCarbonCharacterizationEvent({
        metadataAttributes,
      }),
    ],
  });

const buildWasteGeneratorAccreditationDocumentWithEvents = (
  metadataAttributesList: MetadataAttributeParameter[][],
): BoldDocument =>
  stubDocument({
    externalEvents: metadataAttributesList.map((metadataAttributes) =>
      stubBoldOrganicWasteCarbonCharacterizationEvent({
        metadataAttributes,
      }),
    ),
  });

describe('OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE (author-defined)', () => {
  it.each([
    ['16 03 06', '0.05'],
    ['19 08 14', '0.09'],
    ['19 02 06', '0.05'],
    ['17 05 06', '0.05'],
  ])('has the author-defined carbon fraction for %s', (code, fraction) => {
    expect(
      OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE[code]?.carbonFraction,
    ).toBe(fraction);
  });
});

describe('PreventedEmissionsOthersOrganicHelpers', () => {
  const processorErrors = new PreventedEmissionsProcessorErrors();

  describe('resolveCanonicalLocalWasteClassificationId', () => {
    it('should return empty ids when localWasteClassificationIdRaw is undefined', () => {
      expect(
        resolveCanonicalLocalWasteClassificationId(undefined),
      ).toStrictEqual({});
    });

    it('should return normalized id when valid classification id is provided', () => {
      const result = resolveCanonicalLocalWasteClassificationId('02 01 06');

      expect(result).toEqual({
        localWasteClassificationId: '02 01 06',
        normalizedLocalWasteClassificationId: '02 01 06',
      });
    });

    it('should normalize classification id with different spacing', () => {
      const result = resolveCanonicalLocalWasteClassificationId('02  01  06');

      expect(result).toEqual({
        localWasteClassificationId: '02  01  06',
        normalizedLocalWasteClassificationId: '02 01 06',
      });
    });

    it('should return only localWasteClassificationId when id is not found in valid codes', () => {
      const result = resolveCanonicalLocalWasteClassificationId('99 99 99');

      expect(result).toEqual({
        localWasteClassificationId: '99 99 99',
      });
    });
  });

  describe('getOthersIfOrganicContextFromMassIdDocument', () => {
    it('should return empty context when document subtype is not OTHERS_IF_ORGANIC', () => {
      const document = stubDocument({
        subtype: MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES,
      });

      const result = getOthersIfOrganicContextFromMassIdDocument(document);

      expect(result).toEqual({});
    });

    it('should return empty context when pick up event is not found', () => {
      const document = stubDocument({
        externalEvents: [],
        subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      });

      const result = getOthersIfOrganicContextFromMassIdDocument(document);

      expect(result).toEqual({});
    });

    it('should return empty context when local waste classification id is missing', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldMassIDPickUpEvent({
            metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, undefined]],
          }),
        ],
        subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      });

      const result = getOthersIfOrganicContextFromMassIdDocument(document);

      expect(result).toEqual({});
    });

    it('should return context with normalized id when valid classification id is provided', () => {
      const document = stubDocument({
        externalEvents: [
          stubBoldMassIDPickUpEvent({
            metadataAttributes: [[LOCAL_WASTE_CLASSIFICATION_ID, '02 01 06']],
          }),
        ],
        subtype: MassIDOrganicSubtype.OTHERS_IF_ORGANIC,
      });

      const result = getOthersIfOrganicContextFromMassIdDocument(document);

      expect(result).toEqual({
        localWasteClassificationId: '02 01 06',
        normalizedLocalWasteClassificationId: '02 01 06',
      });
    });
  });

  describe('buildOthersIfOrganicContext', () => {
    it('should return undefined when both ids are nil', () => {
      expect(buildOthersIfOrganicContext({})).toBeUndefined();
      expect(
        buildOthersIfOrganicContext({
          localWasteClassificationId: undefined,
          normalizedLocalWasteClassificationId: undefined,
        }),
      ).toBeUndefined();
    });

    it('should return context with localWasteClassificationId when provided', () => {
      const result = buildOthersIfOrganicContext({
        localWasteClassificationId: '02 01 06',
      });

      expect(result).toEqual({
        localWasteClassificationId: '02 01 06',
      });
    });

    it('should return context with normalizedLocalWasteClassificationId when provided', () => {
      const result = buildOthersIfOrganicContext({
        normalizedLocalWasteClassificationId: '02 01 06',
      });

      expect(result).toEqual({
        normalizedLocalWasteClassificationId: '02 01 06',
      });
    });

    it('should return context with both ids when both are provided', () => {
      const result = buildOthersIfOrganicContext({
        localWasteClassificationId: '02  01  06',
        normalizedLocalWasteClassificationId: '02 01 06',
      });

      expect(result).toEqual({
        localWasteClassificationId: '02  01  06',
        normalizedLocalWasteClassificationId: '02 01 06',
      });
    });
  });

  describe('calculateOthersIfOrganicFactor', () => {
    it('should calculate factor for OPEN_AIR_DUMP with 15% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        BoldBaseline.OPEN_AIR_DUMP,
        '0.15',
      );

      expect(result).toBe(0.698_505);
    });

    it('should calculate factor for LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS with 22% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0.22',
      );

      expect(result).toBe(1.388_677);
    });

    it('should calculate factor for LANDFILLS_WITH_FLARING_OF_METHANE_GAS with 37% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0.37',
      );

      expect(result).toBe(1.274_799);
    });

    it('should calculate factor for OPEN_AIR_DUMP with 58% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        BoldBaseline.OPEN_AIR_DUMP,
        '0.58',
      );

      expect(result).toBe(3.072_695);
    });

    it('should round to 6 decimal places using ROUND_HALF_DOWN', () => {
      const result = calculateOthersIfOrganicFactor(
        BoldBaseline.OPEN_AIR_DUMP,
        '0.15',
      );

      expect(result.toString()).toMatch(/^\d+\.\d{6}$/);
    });

    it('should clamp negative results to zero when carbonFraction is 0', () => {
      const resultFlaring = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0',
      );
      const resultWithoutFlaring = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0',
      );
      const resultDump = calculateOthersIfOrganicFactor(
        BoldBaseline.OPEN_AIR_DUMP,
        '0',
      );

      expect(resultFlaring).toBe(0);
      expect(resultWithoutFlaring).toBe(0);
      expect(resultDump).toBe(0);
    });

    it('should clamp negative results to zero when carbonFraction is 1%', () => {
      const resultFlaring = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0.01',
      );
      const resultWithoutFlaring = calculateOthersIfOrganicFactor(
        BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0.01',
      );
      const resultDump = calculateOthersIfOrganicFactor(
        BoldBaseline.OPEN_AIR_DUMP,
        '0.01',
      );

      expect(resultFlaring).toBe(0);
      expect(resultWithoutFlaring).toBe(0);
      expect(resultDump).toBe(0);
    });
  });

  describe('isCarbonCharacterizationValid', () => {
    it('accepts a pickup within 2 years of analysis', () => {
      expect(isCarbonCharacterizationValid('2026-05-01', '2026-06-01')).toBe(
        true,
      );
    });

    it('accepts a pickup exactly 2 years after analysis', () => {
      expect(isCarbonCharacterizationValid('2024-05-01', '2026-05-01')).toBe(
        true,
      );
    });

    it('rejects a pickup more than 2 years after analysis', () => {
      expect(isCarbonCharacterizationValid('2023-05-01', '2026-05-02')).toBe(
        false,
      );
    });

    it('treats the exact +2y boundary deterministically when inputs differ in time basis', () => {
      // analysisDate is date-only; pickUpDate is a UTC instant on the exact
      // +2y boundary. Both must collapse to the same date basis so the result
      // is independent of the host timezone.
      expect(
        isCarbonCharacterizationValid('2024-05-01', '2026-05-01T23:59:59.999Z'),
      ).toBe(true);
      expect(
        isCarbonCharacterizationValid('2024-05-01', '2026-05-01T00:00:00.000Z'),
      ).toBe(true);
    });

    it.each([
      ['unparseable pickup date', '2026-05-01', 'not-a-date'],
      ['unparseable analysis date', 'not-a-date', '2026-06-01'],
    ])(
      'fails safe and rejects an %s',
      (_scenario, analysisDate, pickUpDate) => {
        expect(isCarbonCharacterizationValid(analysisDate, pickUpDate)).toBe(
          false,
        );
      },
    );
  });

  describe('getGeneratorCarbonCharacterization', () => {
    it('returns undefined when the accreditation document is undefined', () => {
      expect(
        getGeneratorCarbonCharacterization(undefined, '20 01 99'),
      ).toBeUndefined();
    });

    it('returns undefined when the normalized classification id is missing', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
      ]);

      expect(
        getGeneratorCarbonCharacterization(document, undefined),
      ).toBeUndefined();
    });

    it('returns undefined when the document has no external events', () => {
      const document: BoldDocument = {
        ...stubDocument(),
        externalEvents: undefined,
      };

      expect(
        getGeneratorCarbonCharacterization(document, '20 01 99'),
      ).toBeUndefined();
    });

    it('returns undefined when no characterization event matches the code', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '02 02 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
      ]);

      expect(
        getGeneratorCarbonCharacterization(document, '20 01 99'),
      ).toBeUndefined();
    });

    it('returns undefined when the characterization event has no classification id', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
      ]);

      expect(
        getGeneratorCarbonCharacterization(document, '20 01 99'),
      ).toBeUndefined();
    });

    it('returns undefined when the carbon fraction is missing', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
      ]);

      expect(
        getGeneratorCarbonCharacterization(document, '20 01 99'),
      ).toBeUndefined();
    });

    it('returns the characterization when fraction, date and moisture match the code', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
        [MOISTURE_FRACTION, '0.65'],
      ]);

      expect(getGeneratorCarbonCharacterization(document, '20 01 99')).toEqual({
        analysisDate: '2026-05-01',
        carbonFraction: '0.12',
        moistureFraction: '0.65',
      });
    });

    it('returns undefined when the moisture fraction is missing', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
      ]);

      expect(
        getGeneratorCarbonCharacterization(document, '20 01 99'),
      ).toBeUndefined();
    });

    it.each([['abc'], ['15']])(
      'returns undefined when the moisture fraction "%s" is not a valid percentage',
      (moistureFraction) => {
        const document = buildWasteGeneratorAccreditationDocument([
          [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
          [CARBON_FRACTION, '0.12'],
          [CARBON_ANALYSIS_DATE, '2026-05-01'],
          [MOISTURE_FRACTION, moistureFraction],
        ]);

        expect(
          getGeneratorCarbonCharacterization(document, '20 01 99'),
        ).toBeUndefined();
      },
    );

    it.each([['2026-13-99'], ['pending']])(
      'returns undefined when the analysis date "%s" is not a parseable date',
      (analysisDate) => {
        const document = buildWasteGeneratorAccreditationDocument([
          [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
          [CARBON_FRACTION, '0.12'],
          [CARBON_ANALYSIS_DATE, analysisDate],
          [MOISTURE_FRACTION, '0.65'],
        ]);

        expect(
          getGeneratorCarbonCharacterization(document, '20 01 99'),
        ).toBeUndefined();
      },
    );

    it.each([['abc'], ['15']])(
      'returns undefined when the carbon fraction "%s" is not a valid percentage',
      (carbonFraction) => {
        const document = buildWasteGeneratorAccreditationDocument([
          [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
          [CARBON_FRACTION, carbonFraction],
          [CARBON_ANALYSIS_DATE, '2026-05-01'],
          [MOISTURE_FRACTION, '0.65'],
        ]);

        expect(
          getGeneratorCarbonCharacterization(document, '20 01 99'),
        ).toBeUndefined();
      },
    );

    it('returns the characterization when the carbon fraction is a valid percentage', () => {
      const document = buildWasteGeneratorAccreditationDocument([
        [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
        [CARBON_FRACTION, '0.12'],
        [CARBON_ANALYSIS_DATE, '2026-05-01'],
        [MOISTURE_FRACTION, '0.65'],
      ]);

      expect(getGeneratorCarbonCharacterization(document, '20 01 99')).toEqual({
        analysisDate: '2026-05-01',
        carbonFraction: '0.12',
        moistureFraction: '0.65',
      });
    });

    it.each([
      [
        'older event first',
        [
          [
            [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
            [CARBON_FRACTION, '0.10'],
            [CARBON_ANALYSIS_DATE, '2024-01-01'],
            [MOISTURE_FRACTION, '0.50'],
          ],
          [
            [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
            [CARBON_FRACTION, '0.20'],
            [CARBON_ANALYSIS_DATE, '2026-01-01'],
            [MOISTURE_FRACTION, '0.65'],
          ],
        ] as MetadataAttributeParameter[][],
      ],
      [
        'newer event first',
        [
          [
            [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
            [CARBON_FRACTION, '0.20'],
            [CARBON_ANALYSIS_DATE, '2026-01-01'],
            [MOISTURE_FRACTION, '0.65'],
          ],
          [
            [LOCAL_WASTE_CLASSIFICATION_ID, '20 01 99'],
            [CARBON_FRACTION, '0.10'],
            [CARBON_ANALYSIS_DATE, '2024-01-01'],
            [MOISTURE_FRACTION, '0.50'],
          ],
        ] as MetadataAttributeParameter[][],
      ],
    ])(
      'selects the newest valid characterization regardless of array order (%s)',
      (_scenario, metadataAttributesList) => {
        const document = buildWasteGeneratorAccreditationDocumentWithEvents(
          metadataAttributesList,
        );

        expect(
          getGeneratorCarbonCharacterization(document, '20 01 99'),
        ).toEqual({
          analysisDate: '2026-01-01',
          carbonFraction: '0.20',
          moistureFraction: '0.65',
        });
      },
    );
  });

  describe('resolveOthersIfOrganicCarbonFraction', () => {
    const authorContext = { normalizedLocalWasteClassificationId: '02 01 06' };
    const context = { normalizedLocalWasteClassificationId: '20 01 99' };

    it('Tier 1: resolves an author-defined code', () => {
      const result = resolveOthersIfOrganicCarbonFraction(
        authorContext,
        undefined,
        '2026-06-01',
        processorErrors,
      );

      expect(result).toEqual({
        carbonFraction: '0.15',
        resolved: true,
        source: 'author',
      });
    });

    it('Tier 1 wins over an available generator characterization', () => {
      const result = resolveOthersIfOrganicCarbonFraction(
        authorContext,
        {
          analysisDate: '2026-05-01',
          carbonFraction: '0.12',
          moistureFraction: '0.65',
        },
        '2026-06-01',
        processorErrors,
      );

      expect(result).toEqual({
        carbonFraction: '0.15',
        resolved: true,
        source: 'author',
      });
    });

    it('Tier 2: resolves a valid generator characterization', () => {
      const result = resolveOthersIfOrganicCarbonFraction(
        context,
        {
          analysisDate: '2026-05-01',
          carbonFraction: '0.12',
          moistureFraction: '0.65',
        },
        '2026-06-01',
        processorErrors,
      );

      expect(result).toEqual({
        analysisDate: '2026-05-01',
        carbonFraction: '0.12',
        moistureFraction: '0.65',
        resolved: true,
        source: 'generator',
      });
    });

    it('Tier 2 expired → unresolved (expired)', () => {
      const result = resolveOthersIfOrganicCarbonFraction(
        context,
        {
          analysisDate: '2023-05-01',
          carbonFraction: '0.12',
          moistureFraction: '0.65',
        },
        '2026-05-02',
        processorErrors,
      );

      expect(result).toEqual({ reason: 'expired', resolved: false });
    });

    it('Tier 3: no author and no generator value → unresolved (missing)', () => {
      const result = resolveOthersIfOrganicCarbonFraction(
        context,
        undefined,
        '2026-06-01',
        processorErrors,
      );

      expect(result).toEqual({ reason: 'missing', resolved: false });
    });

    it('throws INVALID_CLASSIFICATION_ID when context is undefined', () => {
      expect(() =>
        resolveOthersIfOrganicCarbonFraction(
          undefined,
          undefined,
          '2026-06-01',
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('throws INVALID_CLASSIFICATION_ID for an unknown classification id', () => {
      expect(() =>
        resolveOthersIfOrganicCarbonFraction(
          { normalizedLocalWasteClassificationId: '99 99 99' },
          undefined,
          '2026-06-01',
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('throws SUBTYPE_CDM_CODE_MISMATCH when classification code is not 8.7D', () => {
      expect(() =>
        resolveOthersIfOrganicCarbonFraction(
          { normalizedLocalWasteClassificationId: '02 01 01' },
          undefined,
          '2026-06-01',
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.SUBTYPE_CDM_CODE_MISMATCH);
    });
  });

  describe('buildOthersIfOrganicAuditDetails', () => {
    it('should return audit details for OPEN_AIR_DUMP baseline', () => {
      expect(
        buildOthersIfOrganicAuditDetails(
          '02 01 06',
          '0.15',
          BoldBaseline.OPEN_AIR_DUMP,
        ),
      ).toEqual({
        canonicalLocalWasteClassificationCode: '02 01 06',
        carbonFraction: '0.15',
        computedFactor: Number.parseFloat('0.698505'),
        formulaCoeffs: {
          intercept: Number.parseFloat('-0.1297013'),
          slope: Number.parseFloat('5.521373'),
        },
      });
    });

    it('should return audit details for LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS baseline', () => {
      expect(
        buildOthersIfOrganicAuditDetails(
          '02 01 06',
          '0.15',
          BoldBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        ),
      ).toEqual({
        canonicalLocalWasteClassificationCode: '02 01 06',
        carbonFraction: '0.15',
        computedFactor: Number.parseFloat('0.905557'),
        formulaCoeffs: {
          intercept: Number.parseFloat('-0.1297003'),
          slope: Number.parseFloat('6.901715'),
        },
      });
    });

    it('should return audit details for LANDFILLS_WITH_FLARING_OF_METHANE_GAS baseline', () => {
      expect(
        buildOthersIfOrganicAuditDetails(
          '02 01 06',
          '0.15',
          BoldBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        ),
      ).toEqual({
        canonicalLocalWasteClassificationCode: '02 01 06',
        carbonFraction: '0.15',
        computedFactor: Number.parseFloat('0.439691'),
        formulaCoeffs: {
          intercept: Number.parseFloat('-0.129701'),
          slope: Number.parseFloat('3.795947'),
        },
      });
    });

    it('should use BigNumber for formula coefficients', () => {
      const result = buildOthersIfOrganicAuditDetails(
        '02 01 06',
        '0.15',
        BoldBaseline.OPEN_AIR_DUMP,
      );

      expect(typeof result.formulaCoeffs.intercept).toBe('number');
      expect(typeof result.formulaCoeffs.slope).toBe('number');
      expect(result.formulaCoeffs.intercept).toBe(-0.129_701_3);
      expect(result.formulaCoeffs.slope).toBe(5.521_373);
    });
  });
});
