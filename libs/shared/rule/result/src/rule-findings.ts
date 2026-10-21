import type { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import type { FindingOwner, RuleFinding } from '@carrot-fndn/shared/rule/types';
import type { Get } from 'type-fest';

export type FindingKeyOf<M extends FindingMessageGroups> = {
  [G in keyof M & string]: `${G}.${keyof M[G] & string}`;
}[keyof M & string];

export type FindingMessageGroups = Record<
  string,
  Record<string, FindingMessage>
>;

export interface FindingMeta {
  defaultOwner: FindingOwner;
  dependsOnAccreditation?: MassIDActorType;
}

export interface RenderedRuleFinding {
  finding: RuleFinding;
  message: string;
}

export interface RuleFindings<M extends FindingMessageGroups> {
  codes: ReadonlySet<string>;
  finding: <K extends FindingKeyOf<M>>(key: K) => RuleFinding;
  render: <K extends FindingKeyOf<M>>(
    key: K,
    ...arguments_: FindingArguments<Get<M, K>>
  ) => RenderedRuleFinding;
  result: <K extends FindingKeyOf<M>>(
    key: K,
    ...arguments_: FindingArguments<Get<M, K>>
  ) => { resultComment: string; resultFindings: RuleFinding[] };
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
    finding,
    render,
    result: (key, ...arguments_) => {
      const { finding: renderedFinding, message } = render(key, ...arguments_);

      return { resultComment: message, resultFindings: [renderedFinding] };
    },
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
  { 'ERROR.DOCUMENT_NOT_LOADED': { defaultOwner: 'CARROT' } },
);
