import {
  stubBoldMassIDPickUpEvent,
  stubDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  MassIDOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE,
  OthersIfOrganicCarbonFractionsByCode,
} from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  buildOthersIfOrganicContext,
  calculateOthersIfOrganicFactor,
  getCarbonFractionForOthersIfOrganic,
  getOthersIfOrganicAuditDetails,
  getOthersIfOrganicContextFromMassIdDocument,
  resolveCanonicalLocalWasteClassificationId,
} from './prevented-emissions.others-organic.helpers';

const { LOCAL_WASTE_CLASSIFICATION_ID } = DocumentEventAttributeName;

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
        MethodologyBaseline.OPEN_AIR_DUMP,
        '0.15',
      );

      expect(result).toBe(0.698_505);
    });

    it('should calculate factor for LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS with 22% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0.22',
      );

      expect(result).toBe(1.388_677);
    });

    it('should calculate factor for LANDFILLS_WITH_FLARING_OF_METHANE_GAS with 37% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0.37',
      );

      expect(result).toBe(1.274_799);
    });

    it('should calculate factor for OPEN_AIR_DUMP with 58% carbon', () => {
      const result = calculateOthersIfOrganicFactor(
        MethodologyBaseline.OPEN_AIR_DUMP,
        '0.58',
      );

      expect(result).toBe(3.072_695);
    });

    it('should round to 6 decimal places using ROUND_HALF_DOWN', () => {
      const result = calculateOthersIfOrganicFactor(
        MethodologyBaseline.OPEN_AIR_DUMP,
        '0.15',
      );

      expect(result.toString()).toMatch(/^\d+\.\d{6}$/);
    });

    it('should clamp negative results to zero when carbonFraction is 0', () => {
      const resultFlaring = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0',
      );
      const resultWithoutFlaring = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0',
      );
      const resultDump = calculateOthersIfOrganicFactor(
        MethodologyBaseline.OPEN_AIR_DUMP,
        '0',
      );

      expect(resultFlaring).toBe(0);
      expect(resultWithoutFlaring).toBe(0);
      expect(resultDump).toBe(0);
    });

    it('should clamp negative results to zero when carbonFraction is 1%', () => {
      const resultFlaring = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
        '0.01',
      );
      const resultWithoutFlaring = calculateOthersIfOrganicFactor(
        MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
        '0.01',
      );
      const resultDump = calculateOthersIfOrganicFactor(
        MethodologyBaseline.OPEN_AIR_DUMP,
        '0.01',
      );

      expect(resultFlaring).toBe(0);
      expect(resultWithoutFlaring).toBe(0);
      expect(resultDump).toBe(0);
    });
  });

  describe('getCarbonFractionForOthersIfOrganic', () => {
    it('should throw INVALID_CLASSIFICATION_ID when context is undefined', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic(undefined, processorErrors),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw INVALID_CLASSIFICATION_ID when normalizedLocalWasteClassificationId is missing', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic({}, processorErrors),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw INVALID_CLASSIFICATION_ID when normalizedLocalWasteClassificationId is empty string', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic(
          { normalizedLocalWasteClassificationId: '' },
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw INVALID_CLASSIFICATION_ID when classification id is not in WASTE_CLASSIFICATION_CODES', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic(
          { normalizedLocalWasteClassificationId: '99 99 99' },
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.INVALID_CLASSIFICATION_ID);
    });

    it('should throw SUBTYPE_CDM_CODE_MISMATCH when classification code is not 8.7D', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic(
          { normalizedLocalWasteClassificationId: '02 01 01' },
          processorErrors,
        ),
      ).toThrow(processorErrors.ERROR_MESSAGE.SUBTYPE_CDM_CODE_MISMATCH);
    });

    it('should throw MISSING_CARBON_FRACTION when carbon fraction is not configured', () => {
      expect(() =>
        getCarbonFractionForOthersIfOrganic(
          { normalizedLocalWasteClassificationId: '02 02 99' },
          processorErrors,
        ),
      ).toThrow(
        processorErrors.ERROR_MESSAGE.MISSING_CARBON_FRACTION_FOR_LOCAL_WASTE_CLASSIFICATION_CODE(
          '02 02 99',
        ),
      );
    });

    it('should throw MISSING_CARBON_FRACTION when carbon entry exists but is undefined (defensive branch)', () => {
      const canonicalLocalWasteClassificationCode = '02 01 06';
      const carbonMap: OthersIfOrganicCarbonFractionsByCode =
        OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE;
      const original = carbonMap[canonicalLocalWasteClassificationCode];

      try {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalLocalWasteClassificationCode] = undefined;

        expect(() =>
          getCarbonFractionForOthersIfOrganic(
            {
              normalizedLocalWasteClassificationId:
                canonicalLocalWasteClassificationCode,
            },
            processorErrors,
          ),
        ).toThrow(
          processorErrors.ERROR_MESSAGE.MISSING_CARBON_FRACTION_FOR_LOCAL_WASTE_CLASSIFICATION_CODE(
            canonicalLocalWasteClassificationCode,
          ),
        );
      } finally {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalLocalWasteClassificationCode] = original;
      }
    });

    it('should return carbon fraction when valid classification id is provided', () => {
      const result = getCarbonFractionForOthersIfOrganic(
        { normalizedLocalWasteClassificationId: '02 01 06' },
        processorErrors,
      );

      expect(result).toBe('0.15');
    });
  });

  describe('getOthersIfOrganicAuditDetails', () => {
    it('should throw when local waste classification code is not configured', () => {
      expect(() => {
        getOthersIfOrganicAuditDetails(
          '00 00 00',
          MethodologyBaseline.OPEN_AIR_DUMP,
        );
      }).toThrow(
        'getOthersIfOrganicAuditDetails: no carbon entry for "00 00 00"',
      );
    });

    it('should throw when local waste classification code exists but entry is undefined (defensive branch)', () => {
      const canonicalLocalWasteClassificationCode = '02 01 06';
      const carbonMap = OTHERS_IF_ORGANIC_CARBON_FRACTION_BY_LOCAL_CODE;
      const original = carbonMap[canonicalLocalWasteClassificationCode];

      try {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalLocalWasteClassificationCode] = undefined;

        expect(() => {
          getOthersIfOrganicAuditDetails(
            canonicalLocalWasteClassificationCode,
            MethodologyBaseline.OPEN_AIR_DUMP,
          );
        }).toThrow(
          `getOthersIfOrganicAuditDetails: no carbon entry for "${canonicalLocalWasteClassificationCode}"`,
        );
      } finally {
        // @ts-expect-error - we want to test the defensive branch
        carbonMap[canonicalLocalWasteClassificationCode] = original;
      }
    });

    it('should return audit details for OPEN_AIR_DUMP baseline', () => {
      expect(
        getOthersIfOrganicAuditDetails(
          '02 01 06',
          MethodologyBaseline.OPEN_AIR_DUMP,
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
        getOthersIfOrganicAuditDetails(
          '02 01 06',
          MethodologyBaseline.LANDFILLS_WITHOUT_FLARING_OF_METHANE_GAS,
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
        getOthersIfOrganicAuditDetails(
          '02 01 06',
          MethodologyBaseline.LANDFILLS_WITH_FLARING_OF_METHANE_GAS,
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
      const result = getOthersIfOrganicAuditDetails(
        '02 01 06',
        MethodologyBaseline.OPEN_AIR_DUMP,
      );

      expect(typeof result.formulaCoeffs.intercept).toBe('number');
      expect(typeof result.formulaCoeffs.slope).toBe('number');
      expect(result.formulaCoeffs.intercept).toBe(-0.129_701_3);
      expect(result.formulaCoeffs.slope).toBe(5.521_373);
    });
  });
});
