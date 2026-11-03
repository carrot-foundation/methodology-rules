import type {
  BoldReportType,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { FindingOwner, RuleFinding } from '@carrot-fndn/shared/rule/types';
import type { Get } from 'type-fest';

export type FindingCategory =
  | 'ACCREDITATION'
  | 'DOCUMENT_DIVERGENCE'
  | 'DOCUMENT_READING'
  | 'DUPLICATE_OR_CONFLICT'
  | 'INVALID_DATA'
  | 'LOCATION'
  | 'METHODOLOGY_REQUIREMENT'
  | 'MISSING_DATA'
  | 'MISSING_EVENT'
  | 'PRIVACY'
  | 'PROCESSING_ERROR';

export interface FindingDeclaration {
  finding: RuleFinding;
  meta: FindingMeta;
}

export interface FindingEvidenceSelector {
  field: string;
  source: 'CROSS_VALIDATION';
}

export type FindingKeyOf<M extends FindingMessageGroups> = {
  [G in keyof M & string]: `${G}.${keyof M[G] & string}`;
}[keyof M & string];

export type FindingMessageGroups = Record<
  string,
  Record<string, FindingMessage>
>;

export interface FindingMeta {
  category: FindingCategory;
  defaultOwner: FindingOwner;
  // TEST runs mark the finding NOT_EVALUATED when this actor's accreditation was synthesized
  dependsOnAccreditation?: MassIDActorType;
  description: string;
  // Restricts a shared finding to the manifest kinds whose rule can emit it
  documentKinds?: readonly BoldReportType[];
  evidence?: readonly FindingEvidenceSelector[];
  guidance: string;
  title: string;
}

export interface RenderedRuleFinding {
  finding: RuleFinding;
  message: string;
}

export interface RuleFindings<M extends FindingMessageGroups> {
  codes: ReadonlySet<string>;
  declarations: readonly FindingDeclaration[];
  finding: <K extends FindingKeyOf<M>>(key: K) => RuleFinding;
  render: <K extends FindingKeyOf<M>>(
    key: K,
    ...arguments_: FindingArguments<Get<M, K>>
  ) => RenderedRuleFinding;
  result: <K extends FindingKeyOf<M>>(
    key: K,
    ...arguments_: FindingArguments<Get<M, K>>
  ) => RuleFindingsResult;
}

export interface RuleFindingsResult {
  resultComment: string;
  resultFindings: RuleFinding[];
}

type FindingArguments<Message> = Message extends (
  ...arguments_: infer MessageArguments extends unknown[]
) => string
  ? MessageArguments
  : [];

type FindingMessage = ((...arguments_: never[]) => string) | string;

const renderMessage = (
  message: FindingMessage,
  messageArguments: unknown[],
): string => {
  if (typeof message === 'string') {
    return message;
  }

  // RuleFindings.render type-checks the arguments of each message key
  const template = message as (...templateArguments: unknown[]) => string;

  return template(...messageArguments);
};

export const joinRenderedFindings = (
  renderedFindings: RenderedRuleFinding[],
): RuleFindingsResult => ({
  resultComment: renderedFindings.map(({ message }) => message).join(' '),
  resultFindings: renderedFindings.map(({ finding }) => finding),
});

export const defineRuleFindings = <M extends FindingMessageGroups>(
  slug: string,
  messages: M,
  meta: Record<FindingKeyOf<M>, FindingMeta>,
): RuleFindings<M> => {
  const messagesByKey = new Map(
    Object.entries(messages).flatMap(([group, groupMessages]) =>
      Object.entries(groupMessages).map(
        ([messageKey, message]): [string, FindingMessage] => [
          `${group}.${messageKey}`,
          message,
        ],
      ),
    ),
  );
  const metaByKey = new Map<string, FindingMeta>(Object.entries(meta));
  const missingKeys = [...messagesByKey.keys()].filter(
    (key) => !metaByKey.has(key),
  );
  const extraKeys = [...metaByKey.keys()].filter(
    (key) => !messagesByKey.has(key),
  );

  if (missingKeys.length > 0 || extraKeys.length > 0) {
    throw new Error(
      `Finding metadata of rule "${slug}" does not match its messages: missing [${missingKeys.join(', ')}], extra [${extraKeys.join(', ')}]`,
    );
  }

  const keysWithoutCopy = [...metaByKey]
    .filter(([, { description, guidance, title }]) =>
      [description, guidance, title].some((text) => text.trim() === ''),
    )
    .map(([key]) => key);

  if (keysWithoutCopy.length > 0) {
    throw new Error(
      `Finding metadata of rule "${slug}" has empty catalog copy: [${keysWithoutCopy.join(', ')}]`,
    );
  }

  const lookUp = <Value>(
    valuesByKey: ReadonlyMap<string, Value>,
    key: string,
  ): Value => {
    const value = valuesByKey.get(key);

    if (value === undefined) {
      throw new Error(`Unknown finding key "${key}" for rule "${slug}"`);
    }

    return value;
  };

  const finding = (key: string): RuleFinding => {
    const { defaultOwner, dependsOnAccreditation } = lookUp(metaByKey, key);

    return {
      code: `${slug}.${key}`,
      defaultOwner,
      ...(dependsOnAccreditation && { dependsOnAccreditation }),
    };
  };

  const render: RuleFindings<M>['render'] = (key, ...arguments_) => ({
    finding: finding(key),
    message: renderMessage(lookUp(messagesByKey, key), arguments_),
  });

  return {
    codes: new Set([...messagesByKey.keys()].map((key) => `${slug}.${key}`)),
    declarations: [...metaByKey].map(([key, keyMeta]) => ({
      finding: finding(key),
      meta: keyMeta,
    })),
    finding,
    render,
    result: (key, ...arguments_) =>
      joinRenderedFindings([render(key, ...arguments_)]),
  };
};

export const SHARED_FINDINGS = defineRuleFindings(
  'shared',
  {
    ERROR: {
      DOCUMENT_NOT_LOADED: (documentId: string) =>
        `Could not load the document with id ${documentId}`,
    },
  },
  {
    'ERROR.DOCUMENT_NOT_LOADED': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'O documento da MassID não pôde ser carregado para a auditoria.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Documento da MassID não carregado',
    },
  },
);
