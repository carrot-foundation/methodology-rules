import type { BoldReportType } from '@carrot-fndn/shared/methodologies/bold/types';
import type { FindingOwner } from '@carrot-fndn/shared/rule/types';

import type {
  FindingCategory,
  FindingDeclaration,
  FindingEvidenceSelector,
  FindingMeta,
} from './rule-findings';

export const FINDING_CATALOG_SCHEMA_VERSION = '1.0.0';

export const FINDING_OWNER_LABELS: Record<FindingOwner, string> = {
  CARROT: 'Carrot',
  INTEGRATOR: 'Integrador',
  RECYCLER: 'Reciclador',
  TO_CONFIRM: 'Origem a confirmar',
};

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  ACCREDITATION: 'Credenciamento',
  DOCUMENT_DIVERGENCE: 'Divergência entre documento e dados declarados',
  DOCUMENT_READING: 'Leitura do documento anexado',
  DUPLICATE_OR_CONFLICT: 'Duplicidade ou conflito',
  INVALID_DATA: 'Dado inválido ou fora do formato',
  LOCATION: 'Localização e endereço',
  METHODOLOGY_REQUIREMENT: 'Requisito da metodologia',
  MISSING_DATA: 'Dado obrigatório ausente',
  MISSING_EVENT: 'Evento ausente',
  PRIVACY: 'Privacidade',
  PROCESSING_ERROR: 'Falha de processamento',
};

export interface FindingCatalog {
  categories: Record<FindingCategory, string>;
  diagnostics: FindingCatalogDiagnostic[];
  entries: FindingCatalogEntry[];
  locale: 'pt-BR';
  owners: Record<FindingOwner, string>;
  schemaVersion: typeof FINDING_CATALOG_SCHEMA_VERSION;
  sourceCommit: string;
}

export interface FindingCatalogContext {
  documentKind?: BoldReportType;
  methodology: string;
  ruleSlug: string;
  scope: string;
}

export interface FindingCatalogDiagnostic {
  code: string;
  kind: 'NO_STRUCTURED_EVIDENCE';
}

export interface FindingCatalogEntry {
  category: FindingCategory;
  code: string;
  contexts: FindingCatalogContext[];
  defaultOwner: FindingOwner;
  dependsOnAccreditation?: string;
  description: string;
  evidence: FindingEvidenceSelector[];
  guidance: string;
  title: string;
}

export interface FindingCatalogRuleInput extends FindingCatalogContext {
  findings: ReadonlyArray<FindingCatalogSource>;
}

export interface FindingCatalogSource {
  declarations: readonly FindingDeclaration[];
}

const contextId = ({ methodology, ruleSlug, scope }: FindingCatalogContext) =>
  `${methodology}/${scope}/${ruleSlug}`;

const appliesTo = (
  { finding: { code }, meta }: FindingDeclaration,
  context: FindingCatalogContext,
): boolean => {
  if (meta.documentKinds === undefined) {
    return true;
  }

  if (context.documentKind === undefined) {
    throw new Error(
      `Finding "${code}" is restricted to document kinds [${meta.documentKinds.join(', ')}] but rule "${contextId(context)}" declares none`,
    );
  }

  return meta.documentKinds.includes(context.documentKind);
};

const toEntry = (
  { finding, meta }: FindingDeclaration,
  context: FindingCatalogContext,
): FindingCatalogEntry => ({
  category: meta.category,
  code: finding.code,
  contexts: [context],
  defaultOwner: finding.defaultOwner,
  ...(finding.dependsOnAccreditation && {
    dependsOnAccreditation: finding.dependsOnAccreditation,
  }),
  description: meta.description,
  evidence: [...(meta.evidence ?? [])],
  guidance: meta.guidance,
  title: meta.title,
});

const compareCodePoints = (left: string, right: string): number =>
  left < right ? -1 : Number(left > right);

const compareContexts = (
  left: FindingCatalogContext,
  right: FindingCatalogContext,
): number => compareCodePoints(contextId(left), contextId(right));

interface CatalogAccumulator {
  entriesByCode: Map<string, { entry: FindingCatalogEntry; meta: FindingMeta }>;
  uncoveredCodes: Set<string>;
}

const addDeclaration = (
  { entriesByCode, uncoveredCodes }: CatalogAccumulator,
  declaration: FindingDeclaration,
  context: FindingCatalogContext,
): void => {
  const { code } = declaration.finding;

  if (!appliesTo(declaration, context)) {
    if (!entriesByCode.has(code)) {
      uncoveredCodes.add(code);
    }

    return;
  }

  uncoveredCodes.delete(code);

  const existing = entriesByCode.get(code);

  if (existing === undefined) {
    entriesByCode.set(code, {
      entry: toEntry(declaration, context),
      meta: declaration.meta,
    });

    return;
  }

  if (existing.meta !== declaration.meta) {
    throw new Error(`Finding "${code}" has conflicting catalog declarations`);
  }

  if (
    existing.entry.contexts.some(
      (known) => contextId(known) === contextId(context),
    )
  ) {
    throw new Error(
      `Finding "${code}" is declared twice for rule "${contextId(context)}"`,
    );
  }

  existing.entry.contexts.push(context);
};

export const buildFindingCatalog = ({
  rules,
  sourceCommit,
}: {
  rules: readonly FindingCatalogRuleInput[];
  sourceCommit: string;
}): FindingCatalog => {
  const accumulator: CatalogAccumulator = {
    entriesByCode: new Map(),
    uncoveredCodes: new Set(),
  };

  for (const { findings, ...context } of rules) {
    for (const source of findings) {
      for (const declaration of source.declarations) {
        addDeclaration(accumulator, declaration, context);
      }
    }
  }

  if (accumulator.uncoveredCodes.size > 0) {
    throw new Error(
      `Findings [${[...accumulator.uncoveredCodes].join(', ')}] apply to no rule context`,
    );
  }

  const entries = [...accumulator.entriesByCode.values()]
    .map(({ entry }) => ({
      ...entry,
      contexts: [...entry.contexts].sort(compareContexts),
    }))
    .sort((left, right) => compareCodePoints(left.code, right.code));

  return {
    categories: FINDING_CATEGORY_LABELS,
    diagnostics: entries
      .filter(({ evidence }) => evidence.length === 0)
      .map(({ code }) => ({ code, kind: 'NO_STRUCTURED_EVIDENCE' })),
    entries,
    locale: 'pt-BR',
    owners: FINDING_OWNER_LABELS,
    schemaVersion: FINDING_CATALOG_SCHEMA_VERSION,
    sourceCommit,
  };
};
