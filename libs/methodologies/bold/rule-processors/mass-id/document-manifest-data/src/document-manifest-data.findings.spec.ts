import { BoldReportType } from '@carrot-fndn/shared/methodologies/bold/types';
import { buildFindingCatalog } from '@carrot-fndn/shared/rule/result';

import {
  DOCUMENT_MANIFEST_DATA_FINDINGS,
  toCrossValidationFinding,
} from './document-manifest-data.findings';

describe('toCrossValidationFinding', () => {
  it.each([
    {
      code: 'MTR_NUMBER_NOT_IN_CDF',
      findingKey: 'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF',
    },
    {
      code: 'LOW_CONFIDENCE_RECEIVING_DATE',
      findingKey: 'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
    },
    {
      code: 'LOW_CONFIDENCE_GENERATOR.TAX_ID',
      findingKey: 'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
    },
    {
      code: 'BLANK_FIELD_RECEIVING_DATE',
      findingKey: 'DOCUMENT_EXTRACTION.BLANK_FIELD',
    },
    {
      code: 'LOW_LAYOUT_MATCH_SCORE',
      findingKey: 'DOCUMENT_EXTRACTION.LOW_LAYOUT_MATCH_SCORE',
    },
    {
      code: 'TEXT_LAYER_MISMATCH',
      findingKey: 'DOCUMENT_EXTRACTION.TEXT_LAYER_MISMATCH',
    },
    {
      code: 'UNKNOWN_DOCUMENT_TYPE',
      findingKey: 'DOCUMENT_EXTRACTION.UNKNOWN_DOCUMENT_TYPE',
    },
    {
      code: 'EXTRACTION_FAILED',
      findingKey: 'DOCUMENT_EXTRACTION.EXTRACTION_FAILED',
    },
  ] as const)(
    'should map the $code reason to its finding',
    ({ code, findingKey }) => {
      expect(toCrossValidationFinding({ code, description: code })).toEqual(
        DOCUMENT_MANIFEST_DATA_FINDINGS.finding(findingKey),
      );
    },
  );

  it('should attribute a low-confidence field to the recycler', () => {
    expect(
      toCrossValidationFinding({
        code: 'LOW_CONFIDENCE_RECEIVING_DATE',
        description: 'Low confidence field: receivingDate',
      }),
    ).toEqual({
      code: 'document-manifest-data.DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
      defaultOwner: 'RECYCLER',
    });
  });

  it('should attribute an unrecognized document layout to the integrator and a failed extraction to Carrot', () => {
    expect(
      ['LAYOUT_NOT_RECOGNIZED', 'EXTRACTION_FAILED'].map((code) =>
        toCrossValidationFinding({ code, description: code }),
      ),
    ).toEqual([
      {
        code: 'document-manifest-data.DOCUMENT_EXTRACTION.LAYOUT_NOT_RECOGNIZED',
        defaultOwner: 'INTEGRATOR',
      },
      {
        code: 'document-manifest-data.DOCUMENT_EXTRACTION.EXTRACTION_FAILED',
        defaultOwner: 'CARROT',
      },
    ]);
  });

  it('should throw for a reason code without a finding', () => {
    expect(() =>
      toCrossValidationFinding({ code: 'UNLISTED', description: 'Unlisted' }),
    ).toThrow('Unknown cross-validation reason code "UNLISTED"');
  });
});

describe('DOCUMENT_MANIFEST_DATA_FINDINGS catalog', () => {
  const catalog = buildFindingCatalog({
    rules: [
      {
        documentKind: BoldReportType.MTR,
        findings: [DOCUMENT_MANIFEST_DATA_FINDINGS],
        methodology: 'bold-carbon',
        ruleSlug: 'transport-manifest-data',
        scope: 'mass-id',
      },
      {
        documentKind: BoldReportType.CDF,
        findings: [DOCUMENT_MANIFEST_DATA_FINDINGS],
        methodology: 'bold-carbon',
        ruleSlug: 'recycling-manifest-data',
        scope: 'mass-id',
      },
    ],
    sourceCommit: 'abc1234',
  });
  const documentKindsOf = (key: string) =>
    catalog.entries
      .find(({ code }) => code === `document-manifest-data.${key}`)
      ?.contexts.map(({ documentKind }) => documentKind);

  const mtrOnlyKeys = [
    'CROSS_VALIDATION.HAULER_TAX_ID_MISMATCH',
    'CROSS_VALIDATION.RECEIVER_ADDRESS_MISMATCH',
    'CROSS_VALIDATION.RECEIVER_TAX_ID_MISMATCH',
    'CROSS_VALIDATION.RECEIVING_DATE_MISMATCH',
    'CROSS_VALIDATION.RECEIVING_DATE_WITHIN_TOLERANCE',
    'CROSS_VALIDATION.TRANSPORT_DATE_BLANK',
    'CROSS_VALIDATION.TRANSPORT_DATE_MISMATCH',
    'CROSS_VALIDATION.TRANSPORT_DATE_WITHIN_TOLERANCE',
    'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH',
    'CROSS_VALIDATION.WASTE_QUANTITY_FAR_BELOW_WEIGHING',
    'CROSS_VALIDATION.WASTE_QUANTITY_WEIGHT_MISMATCH',
    'CROSS_VALIDATION.WASTE_TYPE_MISMATCH',
  ];
  const cdfOnlyKeys = [
    'CROSS_VALIDATION.DROP_OFF_DATE_OUTSIDE_PERIOD',
    'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF',
    'CROSS_VALIDATION.RECYCLER_TAX_ID_MISMATCH',
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH',
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH',
    'RESULT.ADDRESS_MISMATCH',
  ];

  it.each([
    ...mtrOnlyKeys.map((key) => ({ expected: [BoldReportType.MTR], key })),
    ...cdfOnlyKeys.map((key) => ({ expected: [BoldReportType.CDF], key })),
    ...[
      'CROSS_VALIDATION.DOCUMENT_NUMBER_MISMATCH',
      'RESULT.MISSING_ISSUE_DATE',
    ].map((key) => ({
      expected: [BoldReportType.CDF, BoldReportType.MTR],
      key,
    })),
  ])(
    'should list $key under the $expected document kinds',
    ({ expected, key }) => {
      expect(documentKindsOf(key)).toEqual(expected);
    },
  );

  it('should restrict exactly the findings listed above to one document kind', () => {
    expect(
      catalog.entries
        .filter(({ contexts }) => contexts.length === 1)
        .map(({ code }) => code),
    ).toHaveLength(mtrOnlyKeys.length + cdfOnlyKeys.length);
  });

  it('should cover every declared finding code', () => {
    expect(new Set(catalog.entries.map(({ code }) => code))).toEqual(
      DOCUMENT_MANIFEST_DATA_FINDINGS.codes,
    );
  });
});
