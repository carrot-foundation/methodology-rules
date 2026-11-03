import {
  BoldAttributeName,
  BoldReportType,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  buildFindingCatalog,
  FINDING_CATALOG_SCHEMA_VERSION,
  FINDING_CATEGORY_LABELS,
  FINDING_OWNER_LABELS,
  type FindingCatalogContext,
} from './finding-catalog';
import { defineRuleFindings } from './rule-findings';
import { stubFindingMeta } from './rule-findings.stubs';

const SOURCE_COMMIT = 'abc1234';

const TEST_FINDINGS = defineRuleFindings(
  'test-rule',
  {
    ERROR: { CRASHED: 'Crashed' },
    FAILED: { PLATE_MISMATCH: 'Plate mismatch', WEIGHT_MISMATCH: 'Weight' },
  },
  {
    'ERROR.CRASHED': stubFindingMeta({
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
    }),
    'FAILED.PLATE_MISMATCH': stubFindingMeta({
      documentKinds: [BoldReportType.MTR],
      evidence: [{ field: 'vehiclePlate', source: 'CROSS_VALIDATION' }],
    }),
    'FAILED.WEIGHT_MISMATCH': stubFindingMeta({
      approvedExceptionAttributes: [BoldAttributeName.TARE],
      dependsOnAccreditation: MassIDActorType.RECYCLER,
    }),
  },
);

const OTHER_FINDINGS = defineRuleFindings(
  'other-rule',
  { FAILED: { MISSING: 'Missing' } },
  { 'FAILED.MISSING': stubFindingMeta() },
);

const MTR_CONTEXT: FindingCatalogContext = {
  documentKind: BoldReportType.MTR,
  methodology: 'bold-carbon',
  ruleSlug: 'transport-rule',
  scope: 'mass-id',
};

const CDF_CONTEXT: FindingCatalogContext = {
  documentKind: BoldReportType.CDF,
  methodology: 'bold-carbon',
  ruleSlug: 'recycling-rule',
  scope: 'mass-id',
};

const PLAIN_CONTEXT: FindingCatalogContext = {
  methodology: 'bold-carbon',
  ruleSlug: 'other-rule',
  scope: 'mass-id',
};

const findEntry = (
  catalog: ReturnType<typeof buildFindingCatalog>,
  code: string,
) => catalog.entries.find((entry) => entry.code === code);

describe('buildFindingCatalog', () => {
  it('should export a versioned PT-BR catalog pinned to its source commit', () => {
    const catalog = buildFindingCatalog({
      rules: [{ ...PLAIN_CONTEXT, findings: [OTHER_FINDINGS] }],
      sourceCommit: SOURCE_COMMIT,
    });

    expect(catalog).toStrictEqual({
      categories: FINDING_CATEGORY_LABELS,
      diagnostics: [
        { code: 'other-rule.FAILED.MISSING', kind: 'NO_STRUCTURED_EVIDENCE' },
      ],
      entries: [
        {
          category: 'INVALID_DATA',
          code: 'other-rule.FAILED.MISSING',
          contexts: [PLAIN_CONTEXT],
          defaultOwner: 'INTEGRATOR',
          description: 'Descrição fictícia do achado.',
          evidence: [],
          guidance: 'Orientação fictícia ao integrador.',
          title: 'Achado fictício',
        },
      ],
      locale: 'pt-BR',
      owners: FINDING_OWNER_LABELS,
      schemaVersion: FINDING_CATALOG_SCHEMA_VERSION,
      sourceCommit: SOURCE_COMMIT,
    });
  });

  it('should label the unresolved owner as "Origem a confirmar"', () => {
    expect(FINDING_OWNER_LABELS.TO_CONFIRM).toBe('Origem a confirmar');
  });

  it('should cover every declared code of a complete set of findings', () => {
    const catalog = buildFindingCatalog({
      rules: [
        { ...MTR_CONTEXT, findings: [TEST_FINDINGS] },
        { ...PLAIN_CONTEXT, findings: [OTHER_FINDINGS] },
      ],
      sourceCommit: SOURCE_COMMIT,
    });

    expect(catalog.entries.map(({ code }) => code)).toStrictEqual([
      'other-rule.FAILED.MISSING',
      'test-rule.ERROR.CRASHED',
      'test-rule.FAILED.PLATE_MISMATCH',
      'test-rule.FAILED.WEIGHT_MISMATCH',
    ]);
  });

  it('should fail when a declared code has no catalog entry', () => {
    const [, ...remainingDeclarations] = TEST_FINDINGS.declarations;

    expect(() =>
      buildFindingCatalog({
        rules: [
          {
            ...MTR_CONTEXT,
            findings: [
              { ...TEST_FINDINGS, declarations: remainingDeclarations },
            ],
          },
        ],
        sourceCommit: SOURCE_COMMIT,
      }),
    ).toThrow(
      'Finding catalog is missing entries for [test-rule.ERROR.CRASHED]',
    );
  });

  it('should fail when the catalog owner disagrees with the emitted owner', () => {
    const declarations = TEST_FINDINGS.declarations.map((declaration) =>
      declaration.finding.code === 'test-rule.ERROR.CRASHED'
        ? {
            ...declaration,
            meta: { ...declaration.meta, defaultOwner: 'INTEGRATOR' as const },
          }
        : declaration,
    );

    expect(() =>
      buildFindingCatalog({
        rules: [
          {
            ...MTR_CONTEXT,
            findings: [{ ...TEST_FINDINGS, declarations }],
          },
        ],
        sourceCommit: SOURCE_COMMIT,
      }),
    ).toThrow(
      'Finding catalog owner "INTEGRATOR" for "test-rule.ERROR.CRASHED" disagrees with the emitted owner "CARROT"',
    );
  });

  it('should fail when the same rule context declares a finding twice', () => {
    expect(() =>
      buildFindingCatalog({
        rules: [
          { ...PLAIN_CONTEXT, findings: [OTHER_FINDINGS, OTHER_FINDINGS] },
        ],
        sourceCommit: SOURCE_COMMIT,
      }),
    ).toThrow(
      'Finding "other-rule.FAILED.MISSING" is declared twice for rule "bold-carbon/mass-id/other-rule"',
    );
  });

  it('should fail when two declarations of the same code conflict', () => {
    const conflicting = defineRuleFindings(
      'other-rule',
      { FAILED: { MISSING: 'Missing' } },
      { 'FAILED.MISSING': stubFindingMeta({ title: 'Outro título' }) },
    );

    expect(() =>
      buildFindingCatalog({
        rules: [
          { ...PLAIN_CONTEXT, findings: [OTHER_FINDINGS] },
          { ...MTR_CONTEXT, findings: [conflicting] },
        ],
        sourceCommit: SOURCE_COMMIT,
      }),
    ).toThrow(
      'Finding "other-rule.FAILED.MISSING" has conflicting catalog declarations',
    );
  });

  it('should merge the contexts of a declaration shared by several rules', () => {
    const catalog = buildFindingCatalog({
      rules: [
        { ...PLAIN_CONTEXT, findings: [OTHER_FINDINGS] },
        { ...MTR_CONTEXT, findings: [OTHER_FINDINGS] },
      ],
      sourceCommit: SOURCE_COMMIT,
    });

    expect(findEntry(catalog, 'other-rule.FAILED.MISSING')?.contexts).toEqual([
      PLAIN_CONTEXT,
      MTR_CONTEXT,
    ]);
  });

  describe('document kinds', () => {
    const catalog = buildFindingCatalog({
      rules: [
        { ...MTR_CONTEXT, findings: [TEST_FINDINGS] },
        { ...CDF_CONTEXT, findings: [TEST_FINDINGS] },
      ],
      sourceCommit: SOURCE_COMMIT,
    });

    it('should keep a finding restricted to MTR out of the CDF context', () => {
      expect(
        findEntry(catalog, 'test-rule.FAILED.PLATE_MISMATCH')?.contexts,
      ).toEqual([MTR_CONTEXT]);
    });

    it('should list an unrestricted finding under both document kinds', () => {
      expect(
        findEntry(catalog, 'test-rule.ERROR.CRASHED')?.contexts.map(
          ({ documentKind }) => documentKind,
        ),
      ).toEqual([BoldReportType.CDF, BoldReportType.MTR]);
    });

    it('should fail when a restricted finding reaches a rule without a document kind', () => {
      expect(() =>
        buildFindingCatalog({
          rules: [{ ...PLAIN_CONTEXT, findings: [TEST_FINDINGS] }],
          sourceCommit: SOURCE_COMMIT,
        }),
      ).toThrow(
        'Finding "test-rule.FAILED.PLATE_MISMATCH" is restricted to document kinds [MTR] but rule "bold-carbon/mass-id/other-rule" declares none',
      );
    });

    it('should fail when a restricted finding applies to no rule context', () => {
      expect(() =>
        buildFindingCatalog({
          rules: [{ ...CDF_CONTEXT, findings: [TEST_FINDINGS] }],
          sourceCommit: SOURCE_COMMIT,
        }),
      ).toThrow(
        'Findings [test-rule.FAILED.PLATE_MISMATCH] apply to no rule context',
      );
    });
  });

  describe('diagnostics', () => {
    const catalog = buildFindingCatalog({
      rules: [{ ...MTR_CONTEXT, findings: [TEST_FINDINGS] }],
      sourceCommit: SOURCE_COMMIT,
    });

    it('should keep the accreditation dependency and waiving exceptions of a finding', () => {
      expect(
        findEntry(catalog, 'test-rule.FAILED.WEIGHT_MISMATCH'),
      ).toMatchObject({
        approvedExceptionAttributes: [BoldAttributeName.TARE],
        dependsOnAccreditation: MassIDActorType.RECYCLER,
      });
    });

    it('should keep the typed evidence selectors of a finding', () => {
      expect(
        findEntry(catalog, 'test-rule.FAILED.PLATE_MISMATCH')?.evidence,
      ).toEqual([{ field: 'vehiclePlate', source: 'CROSS_VALIDATION' }]);
    });

    it('should report every finding without structured evidence and every waivable finding', () => {
      expect(catalog.diagnostics).toStrictEqual([
        { code: 'test-rule.ERROR.CRASHED', kind: 'NO_STRUCTURED_EVIDENCE' },
        {
          code: 'test-rule.FAILED.WEIGHT_MISMATCH',
          kind: 'NO_STRUCTURED_EVIDENCE',
        },
        {
          attributes: [BoldAttributeName.TARE],
          code: 'test-rule.FAILED.WEIGHT_MISMATCH',
          kind: 'APPROVED_EXCEPTION_NOT_IN_EVIDENCE',
        },
      ]);
    });
  });
});
