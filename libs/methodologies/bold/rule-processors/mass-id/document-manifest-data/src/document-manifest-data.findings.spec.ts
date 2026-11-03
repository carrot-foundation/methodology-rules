import {
  BoldAttributeName,
  BoldReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { buildFindingCatalog } from '@carrot-fndn/shared/rule/result';

import {
  DOCUMENT_MANIFEST_DATA_FINDINGS,
  toCrossValidationFinding,
} from './document-manifest-data.findings';

describe('toCrossValidationFinding', () => {
  it.each([
    {
      code: 'MTR_NUMBER_NOT_IN_CDF',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF',
      ),
    },
    {
      code: 'LOW_CONFIDENCE_RECEIVING_DATE',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
      ),
    },
    {
      code: 'LOW_CONFIDENCE_GENERATOR.TAX_ID',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
      ),
    },
    {
      code: 'LOW_LAYOUT_MATCH_SCORE',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.LOW_LAYOUT_MATCH_SCORE',
      ),
    },
    {
      code: 'UNKNOWN_DOCUMENT_TYPE',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.UNKNOWN_DOCUMENT_TYPE',
      ),
    },
    {
      code: 'EXTRACTION_FAILED',
      expectedFinding: DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.EXTRACTION_FAILED',
      ),
    },
  ])(
    'should map the $code reason to its finding',
    ({ code, expectedFinding }) => {
      expect(toCrossValidationFinding({ code, description: code })).toEqual(
        expectedFinding,
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

  it.each([
    {
      expected: [BoldReportType.MTR],
      key: 'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH',
    },
    {
      expected: [BoldReportType.MTR],
      key: 'CROSS_VALIDATION.WASTE_TYPE_MISMATCH',
    },
    {
      expected: [BoldReportType.CDF],
      key: 'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF',
    },
    {
      expected: [BoldReportType.CDF],
      key: 'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH',
    },
    { expected: [BoldReportType.CDF], key: 'RESULT.ADDRESS_MISMATCH' },
    {
      expected: [BoldReportType.CDF, BoldReportType.MTR],
      key: 'CROSS_VALIDATION.DOCUMENT_NUMBER_MISMATCH',
    },
    {
      expected: [BoldReportType.CDF, BoldReportType.MTR],
      key: 'RESULT.MISSING_ISSUE_DATE',
    },
  ])(
    'should list $key under the $expected document kinds',
    ({ expected, key }) => {
      expect(documentKindsOf(key)).toEqual(expected);
    },
  );

  it('should cover every declared finding code', () => {
    expect(new Set(catalog.entries.map(({ code }) => code))).toEqual(
      DOCUMENT_MANIFEST_DATA_FINDINGS.codes,
    );
  });

  it('should flag the missing issue date as waivable by an exception the execution does not record', () => {
    expect(catalog.diagnostics).toContainEqual({
      attributes: [BoldAttributeName.ISSUE_DATE],
      code: 'document-manifest-data.RESULT.MISSING_ISSUE_DATE',
      kind: 'APPROVED_EXCEPTION_NOT_IN_EVIDENCE',
    });
  });
});
