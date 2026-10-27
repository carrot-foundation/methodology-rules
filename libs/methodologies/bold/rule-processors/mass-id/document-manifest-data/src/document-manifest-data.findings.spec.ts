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
