# Document Query Bounded-Parallelism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `DocumentQueryService.loadQueryCriteria` fetch related documents in parallel (cap 10) while preserving byte-identical output for every existing rule, then apply Smaug's canonical actor sort to credit-order rewards-distribution so its actors array is deterministic.

**Architecture:** A new pure async-generator primitive `boundedParallelFetchInOrder` in `libs/shared/helpers` implements the bounded-concurrency pool with in-order consumption. `BaseDocumentQueryService.loadQueryCriteria` consumes the primitive via `for await`, splitting the old `loadDocument` into `fetchDocument` (pure S3 fetch) and `processFetchedDocument` (callback + recursion). The rewards-distribution fix applies Smaug's canonical actor order at `calculateRewardsDistribution`'s return.

**Tech Stack:** TypeScript (ES2022 target, lib ES2023), Nx monorepo, Vitest (100% coverage threshold enforced via `.vitest/config/vitest.base.config.ts:119-124`), Pino logger, BigNumber.js.

**Spec reference:** `docs/superpowers/specs/2026-04-09-document-query-bounded-parallelism-design.md`

**Branch:** `perf/document-query-bounded-parallelism` (already created).

---

## File structure

| Path | Change | Responsibility |
|---|---|---|
| `libs/shared/helpers/src/bounded-parallel.helpers.ts` | CREATE | Pure async-generator primitive. ~50 lines. No domain coupling. |
| `libs/shared/helpers/src/bounded-parallel.helpers.spec.ts` | CREATE | Exhaustive unit tests (100% branch coverage in isolation). |
| `libs/shared/helpers/src/index.ts` | MODIFY | Export the new helper. |
| `libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts` | MODIFY | Replace abstract `loadDocument` with abstract `fetchDocument` + `processFetchedDocument`. Rewrite `loadQueryCriteria` to use the primitive. |
| `libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts` | MODIFY | Split concrete `loadDocument` into `fetchDocument` + `processFetchedDocument`. |
| `libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts` | MODIFY | Add parallel-semantics tests. Keep all existing tests green. |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.ts` | MODIFY | Add canonical actor sort. Apply in `calculateRewardsDistribution`. |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.spec.ts` | MODIFY | Add sort tests (canonical order, tiebreak, completeness). |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts` | REVERT | Remove the temporary `[rewards-distribution]` debug logs. |

## Nx project reference (for `pnpm nx` commands)

- `shared-helpers`
- `shared-methodologies-bold-io-helpers`
- `methodologies-bold-rule-processors-credit-order-rewards-distribution`

## Commitlint scopes allowed

From the prior commit attempt: only `nx`, `rule`, `shared`, `script` are valid scopes. Use `shared` for primitive and query-service changes, `rule` for rewards-distribution changes.

---

## Task 1: Write the primitive tests (no implementation yet)

**Files:**
- Create: `libs/shared/helpers/src/bounded-parallel.helpers.spec.ts`

**Goal:** Write the full test suite for `boundedParallelFetchInOrder` first. It will fail to compile until Task 2 creates the source file.

- [ ] **Step 1: Create the spec file with all tests**

Write the file with exactly this content:

```ts
import {
  boundedParallelFetchInOrder,
  DEFAULT_FETCH_CONCURRENCY,
} from './bounded-parallel.helpers';

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

const flushMicrotasks = async (): Promise<void> => {
  // Several awaits to allow chained .then handlers to run.
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
};

const collect = async <Task, Value>(
  generator: AsyncGenerator<{ index: number; task: Task; value: Value }>,
): Promise<Array<{ index: number; task: Task; value: Value }>> => {
  const out: Array<{ index: number; task: Task; value: Value }> = [];
  for await (const item of generator) {
    out.push(item);
  }
  return out;
};

describe('boundedParallelFetchInOrder', () => {
  it('exports a default concurrency constant of 10', () => {
    expect(DEFAULT_FETCH_CONCURRENCY).toBe(10);
  });

  it('yields nothing for an empty task list', async () => {
    const fetchOne = vi.fn();
    const result = await collect(
      boundedParallelFetchInOrder([], fetchOne, 10),
    );

    expect(result).toEqual([]);
    expect(fetchOne).not.toHaveBeenCalled();
  });

  it('yields a single task', async () => {
    const fetchOne = vi.fn(async (task: string) => `value-${task}`);
    const result = await collect(
      boundedParallelFetchInOrder(['a'], fetchOne, 10),
    );

    expect(result).toEqual([{ index: 0, task: 'a', value: 'value-a' }]);
    expect(fetchOne).toHaveBeenCalledTimes(1);
  });

  it('yields tasks in input order when concurrency equals task count', async () => {
    const fetchOne = vi.fn(async (task: number) => task * 10);
    const result = await collect(
      boundedParallelFetchInOrder([1, 2, 3], fetchOne, 3),
    );

    expect(result).toEqual([
      { index: 0, task: 1, value: 10 },
      { index: 1, task: 2, value: 20 },
      { index: 2, task: 3, value: 30 },
    ]);
  });

  it('yields tasks in input order when task count exceeds concurrency', async () => {
    const tasks = Array.from({ length: 25 }, (_, i) => i);
    const fetchOne = vi.fn(async (task: number) => `doc-${task}`);

    const result = await collect(
      boundedParallelFetchInOrder(tasks, fetchOne, 10),
    );

    expect(result).toHaveLength(25);
    expect(result.map((item) => item.index)).toEqual(tasks);
    expect(result.map((item) => item.value)).toEqual(
      tasks.map((t) => `doc-${t}`),
    );
  });

  it('yields tasks in input order even when resolutions arrive out of order', async () => {
    const deferreds = Array.from({ length: 5 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) => deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1, 2, 3, 4], fetchOne, 5),
    );

    // Resolve in reverse order
    deferreds[4]!.resolve('value-4');
    deferreds[3]!.resolve('value-3');
    deferreds[2]!.resolve('value-2');
    deferreds[1]!.resolve('value-1');
    deferreds[0]!.resolve('value-0');

    const result = await resultPromise;

    expect(result).toEqual([
      { index: 0, task: 0, value: 'value-0' },
      { index: 1, task: 1, value: 'value-1' },
      { index: 2, task: 2, value: 'value-2' },
      { index: 3, task: 3, value: 'value-3' },
      { index: 4, task: 4, value: 'value-4' },
    ]);
  });

  it('never has more than `concurrency` fetches outstanding at once', async () => {
    let active = 0;
    let peak = 0;

    const fetchOne = async (task: number) => {
      active += 1;
      peak = Math.max(peak, active);
      // Yield to event loop so other fetches can start
      await Promise.resolve();
      await Promise.resolve();
      active -= 1;
      return task;
    };

    await collect(
      boundedParallelFetchInOrder(
        Array.from({ length: 25 }, (_, i) => i),
        fetchOne,
        10,
      ),
    );

    expect(peak).toBeLessThanOrEqual(10);
    expect(peak).toBe(10);
  });

  it('does not start task 11 while the walker is blocked on task 0', async () => {
    const deferreds = Array.from({ length: 15 }, () => createDeferred<string>());
    const fetchOne = vi.fn((_task: number, index: number) => deferreds[index]!.promise);

    // Fire and forget — we're asserting call counts while it's still pending.
    void collect(
      boundedParallelFetchInOrder(
        Array.from({ length: 15 }, (_, i) => i),
        fetchOne,
        10,
      ),
    );

    await flushMicrotasks();
    expect(fetchOne).toHaveBeenCalledTimes(10);

    // Resolve slots 1..9 (slot 0 still pending)
    for (let i = 1; i < 10; i += 1) {
      deferreds[i]!.resolve(`value-${i}`);
    }
    await flushMicrotasks();

    // Walker is blocked on slot 0 → no new fetches should fire
    expect(fetchOne).toHaveBeenCalledTimes(10);

    // Resolve slot 0 — walker should drain and dispatch new fetches
    deferreds[0]!.resolve('value-0');
    await flushMicrotasks();

    // As the walker drains, slots 10..14 should be dispatched
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(11);

    // Resolve everything else so the test completes
    for (let i = 10; i < 15; i += 1) {
      deferreds[i]!.resolve(`value-${i}`);
    }
    await flushMicrotasks();
  });

  it('fires notifier.get(i) when a waiter is present', async () => {
    // Walker reaches slot 0 before fetch resolves → waiter is registered →
    // fetch resolves later → notifier fires → walker proceeds.
    const deferred = createDeferred<string>();
    const fetchOne = () => deferred.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0], fetchOne, 10),
    );

    // Walker is awaiting the notifier by now
    await flushMicrotasks();

    deferred.resolve('value-0');
    const result = await resultPromise;

    expect(result).toEqual([{ index: 0, task: 0, value: 'value-0' }]);
  });

  it('handles notifier.get(i) being undefined (fetch lands before walker arrives)', async () => {
    // Resolutions that land before the walker gets to them exercise the
    // "no waiter registered" branch in .then.
    const fetchOne = async (task: number) => `value-${task}`;

    const result = await collect(
      boundedParallelFetchInOrder([0, 1, 2], fetchOne, 10),
    );

    expect(result.map((r) => r.value)).toEqual(['value-0', 'value-1', 'value-2']);
  });

  it('propagates the first fetch rejection as the thrown error', async () => {
    const error = new Error('fetch failed');
    const fetchOne = async (task: number) => {
      if (task === 2) throw error;
      return `value-${task}`;
    };

    await expect(
      collect(boundedParallelFetchInOrder([0, 1, 2, 3, 4], fetchOne, 10)),
    ).rejects.toBe(error);
  });

  it('keeps the FIRST error when multiple fetches reject', async () => {
    const firstError = new Error('first');
    const secondError = new Error('second');
    const deferreds = Array.from({ length: 3 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) => deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1, 2], fetchOne, 10),
    );

    // Reject slot 1 first, then slot 2
    deferreds[1]!.reject(firstError);
    await flushMicrotasks();
    deferreds[2]!.reject(secondError);
    deferreds[0]!.resolve('value-0');

    await expect(resultPromise).rejects.toBe(firstError);
  });

  it('wakes a waiting walker when an error occurs', async () => {
    // Walker is waiting on slot 0 when slot 1 rejects.
    // The flush-all-notifiers branch must wake the walker so it can throw.
    const error = new Error('kaboom');
    const deferreds = Array.from({ length: 2 }, () => createDeferred<string>());
    const fetchOne = (_task: number, index: number) => deferreds[index]!.promise;

    const resultPromise = collect(
      boundedParallelFetchInOrder([0, 1], fetchOne, 10),
    );

    await flushMicrotasks();
    // Slot 1 rejects while walker is awaiting slot 0's notifier
    deferreds[1]!.reject(error);

    await expect(resultPromise).rejects.toBe(error);
  });

  it('skips awaiting when an error has already been captured before the current iteration', async () => {
    // Sequential error → first iteration fails → second iteration's
    // `fatalError !== undefined` guard should trip before awaiting.
    const error = new Error('upstream');
    const fetchOne = async (task: number) => {
      if (task === 0) throw error;
      return `value-${task}`;
    };

    await expect(
      collect(boundedParallelFetchInOrder([0, 1, 2], fetchOne, 10)),
    ).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails with module not found**

Run: `pnpm nx test shared-helpers --testPathPattern bounded-parallel`
Expected: Test suite fails to compile / import — `bounded-parallel.helpers` module not found.

- [ ] **Step 3: Do NOT commit yet.** Moving straight to Task 2 to make these tests pass.

---

## Task 2: Implement the primitive

**Files:**
- Create: `libs/shared/helpers/src/bounded-parallel.helpers.ts`

**Goal:** Make all Task 1 tests pass with a minimal, correct implementation.

- [ ] **Step 1: Create the source file**

Write `libs/shared/helpers/src/bounded-parallel.helpers.ts` with exactly this content:

```ts
export const DEFAULT_FETCH_CONCURRENCY = 10;

/**
 * Fetch a list of tasks in parallel with a bounded concurrency cap, yielding
 * results in the original input order.
 *
 * Memory invariant: at any moment, the number of tasks whose values are held
 * (in-flight fetches + resolved-but-not-yet-yielded values) is at most
 * `concurrency`. Each value is released as soon as the caller consumes its
 * yield, and a new fetch is dispatched to refill the pipeline.
 *
 * Error semantics: on the first rejection, the generator throws that error on
 * its next iteration. Already-in-flight fetches run to completion naturally
 * (no cancellation) but their results are discarded. Subsequent errors are
 * swallowed in favor of the first.
 */
export async function* boundedParallelFetchInOrder<Task, Value>(
  tasks: readonly Task[],
  fetchOne: (task: Task, index: number) => Promise<Value>,
  concurrency: number,
): AsyncGenerator<{ index: number; task: Task; value: Value }> {
  const fetched = new Map<number, Value>();
  const notifiers = new Map<number, () => void>();
  let nextDispatch = 0;
  let inFlightCount = 0;
  let fatalError: { error: unknown } | undefined;

  const dispatch = (): void => {
    while (
      fatalError === undefined &&
      inFlightCount + fetched.size < concurrency &&
      nextDispatch < tasks.length
    ) {
      const taskIndex = nextDispatch;
      nextDispatch += 1;
      inFlightCount += 1;

      fetchOne(tasks[taskIndex]!, taskIndex)
        .then((value) => {
          inFlightCount -= 1;
          fetched.set(taskIndex, value);
          const notify = notifiers.get(taskIndex);
          if (notify !== undefined) {
            notifiers.delete(taskIndex);
            notify();
          }
        })
        .catch((error: unknown) => {
          inFlightCount -= 1;
          if (fatalError === undefined) {
            fatalError = { error };
          }
          for (const notify of notifiers.values()) {
            notify();
          }
          notifiers.clear();
        });
    }
  };

  dispatch();

  for (let i = 0; i < tasks.length; i += 1) {
    if (fatalError !== undefined) {
      throw fatalError.error;
    }
    if (!fetched.has(i)) {
      await new Promise<void>((resolve) => {
        notifiers.set(i, resolve);
      });
    }
    if (fatalError !== undefined) {
      throw fatalError.error;
    }

    const value = fetched.get(i) as Value;
    fetched.delete(i);
    dispatch();

    yield { index: i, task: tasks[i]!, value };
  }
}
```

- [ ] **Step 2: Run the spec file**

Run: `pnpm nx test shared-helpers --testPathPattern bounded-parallel`
Expected: All 14 tests in `bounded-parallel.helpers.spec.ts` pass.

If any test fails, read the failure message, consult the corresponding test case in Task 1, and fix the implementation. Do NOT move to Step 3 until all tests pass.

- [ ] **Step 3: Verify 100% coverage on the new file**

Run: `pnpm nx test shared-helpers --coverage`
Expected: Coverage report shows 100% for `bounded-parallel.helpers.ts` across branches/functions/lines/statements.

If any threshold is under 100%, the test suite fails automatically (enforced in `.vitest/config/vitest.base.config.ts:119-124`). Inspect the uncovered lines/branches in the report and add a test case to cover them.

- [ ] **Step 4: Export the helper from the package index**

Modify `libs/shared/helpers/src/index.ts` — add one new line in alphabetical position:

```ts
export * from './address.helpers';
export * from './array.helpers';
export * from './assert.validators';
export * from './bounded-parallel.helpers';
export * from './calculate-distance-between-coordinates';
export * from './common.helpers';
export * from './document.helpers';
export * from './is.validators';
export * from './logger.helpers';
export * from './math.helpers';
export * from './string-comparison.helpers';
export * from './string.helpers';
export * from './timezone.helpers';
```

- [ ] **Step 5: Run lint + ts + test on shared-helpers**

```
pnpm nx lint shared-helpers --fix
pnpm nx ts shared-helpers
pnpm nx test shared-helpers
```

All three must succeed. Fix any issues before committing.

- [ ] **Step 6: Commit**

```bash
git add \
  libs/shared/helpers/src/bounded-parallel.helpers.ts \
  libs/shared/helpers/src/bounded-parallel.helpers.spec.ts \
  libs/shared/helpers/src/index.ts
git commit -m "$(cat <<'EOF'
feat(shared): add boundedParallelFetchInOrder primitive

Pure async-generator helper for bounded-concurrency parallel fetches
with in-order consumption. Memory-bounded at concurrency values
simultaneously (in-flight + buffered), with immediate reference
release on consumption. Preserves the first error on rejection.

Used by the upcoming DocumentQueryService.loadQueryCriteria refactor
to parallelize related-document fetches without changing call-order
semantics.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Split concrete `loadDocument` into `fetchDocument` + `processFetchedDocument`

**Files:**
- Modify: `libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts`
- Modify: `libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts`

**Goal:** Make the concrete `DocumentQueryService` expose two separate protected methods: one for pure fetching, one for post-fetch processing. The base class gets matching abstract signatures. Existing `loadQueryCriteria` behavior is preserved verbatim.

- [ ] **Step 1: Update the abstract base class**

Read the current file to get exact content:

Run: `cat libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts`

Replace the class body. Open the file and replace the current `abstract loadDocument<T = void>` block and the existing `loadQueryCriteria` method with the new shape.

**Final content of `libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts`:**

```ts
import type { AnyObject } from '@carrot-fndn/shared/types';

import {
  boundedParallelFetchInOrder,
  DEFAULT_FETCH_CONCURRENCY,
} from '@carrot-fndn/shared/helpers';

import type {
  ConnectionKeys,
  DocumentFetcher,
  DocumentKey,
  DocumentQuery,
  Visitor,
} from './document-query.service.types';

export abstract class BaseDocumentQueryService<
  Document extends AnyObject,
  Criteria extends AnyObject,
  QueryContext extends AnyObject,
> {
  constructor(
    protected readonly rootDocumentFetcher: DocumentFetcher<Document>,
    protected readonly documentFetcher: DocumentFetcher<Document>,
  ) {}

  async load({
    context,
    criteria,
    documentId,
  }: {
    context: QueryContext;
    criteria: Criteria;
    documentId: string;
  }): Promise<DocumentQuery<Document>> {
    const document = await this.rootDocumentFetcher.fetch(
      this.getDocumentKey({
        context,
        documentId,
      }),
    );

    return {
      iterator: () => ({
        // eslint-disable-next-line no-shadow
        each: async (callback: (document: Visitor<Document>) => void) => {
          await this.loadQueryCriteria({
            callback,
            context,
            criteria,
            document,
          });
        },
        // eslint-disable-next-line no-shadow
        map: async <T>(callback: (document: Visitor<Document>) => T) =>
          this.loadQueryCriteria<T>({
            callback,
            context,
            criteria,
            document,
          }),
      }),
      rootDocument: document,
    };
  }

  protected abstract fetchDocument(
    documentKey: DocumentKey,
  ): Promise<Document>;

  protected abstract getConnectionKeys(
    criteria: Criteria,
    document: Document,
    context: QueryContext,
  ): Array<ConnectionKeys<Criteria>>;

  protected abstract getDocumentKey({
    context,
    documentId,
  }: {
    context: QueryContext;
    documentId: string;
  }): DocumentKey;

  protected async loadQueryCriteria<T = void>({
    callback,
    context,
    criteria,
    document,
  }: {
    // eslint-disable-next-line no-shadow
    callback: (document: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    document: Document;
  }): Promise<T[]> {
    const connections = this.getConnectionKeys(criteria, document, context);

    interface FetchTask {
      criterion: Criteria;
      documentKey: DocumentKey;
    }

    const tasks: FetchTask[] = [];
    for (const { criteria: criterion, documentKeys } of connections) {
      for (const documentKey of documentKeys) {
        tasks.push({ criterion, documentKey });
      }
    }

    const results: T[] = [];
    for await (const { task, value: fetchedDocument } of boundedParallelFetchInOrder(
      tasks,
      async (task: FetchTask) => this.fetchDocument(task.documentKey),
      DEFAULT_FETCH_CONCURRENCY,
    )) {
      results.push(
        ...(await this.processFetchedDocument<T>({
          callback,
          context,
          criteria: task.criterion,
          document: fetchedDocument,
        })),
      );
    }

    return results;
  }

  protected abstract processFetchedDocument<T = void>(params: {
    callback: (document: Visitor<Document>) => T;
    context: QueryContext;
    criteria: Criteria;
    document: Document;
  }): Promise<T[]>;
}
```

Key changes from the old version:
1. Imports `boundedParallelFetchInOrder` and `DEFAULT_FETCH_CONCURRENCY` from `@carrot-fndn/shared/helpers`.
2. `loadDocument` abstract method is REMOVED.
3. `fetchDocument` abstract method is ADDED.
4. `processFetchedDocument` abstract method is ADDED.
5. `loadQueryCriteria` is rewritten to consume the primitive. The inner nested `for...of` loop is replaced with a single `for await` over the generator.

- [ ] **Step 2: Update the concrete `DocumentQueryService`**

**Final content of `libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts`:**

```ts
import type {
  BoldDocument,
  BoldDocumentEvent,
  BoldDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { type DocumentLoader } from '@carrot-fndn/shared/document/loader';
import {
  isNil,
  isNonEmptyString,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';

import type {
  ConnectionKeys,
  DocumentFetcher,
  DocumentKey,
  DocumentQueryCriteria,
  QueryContext,
  Visitor,
} from './document-query.service.types';

import { BaseDocumentQueryService } from './abstract-document-query.service';
import {
  isDocumentRelation,
  isObject,
  isRelatedDocumentCriteria,
  validateDocument,
} from './document-query.service.validators';

export class DocumentQueryService extends BaseDocumentQueryService<
  BoldDocument,
  DocumentQueryCriteria,
  QueryContext
> {
  constructor(private readonly documentLoaderService: DocumentLoader) {
    const documentFetcher: DocumentFetcher<BoldDocument> = {
      fetch: async ({ s3Key: documentKey }) => {
        const document = await this.documentLoaderService.load({
          key: documentKey,
        });

        if (isNil(document) || isNil(document.document)) {
          throw new Error(`Document not found: ${documentKey}`);
        }

        const validation = validateDocument(document.document);

        if (!validation.success) {
          throw new Error(
            `Invalid document: ${documentKey}: ${JSON.stringify(validation.error.issues)}`,
          );
        }

        return validation.data;
      },
    };

    super(documentFetcher, documentFetcher);
  }

  protected async fetchDocument(
    documentKey: DocumentKey,
  ): Promise<BoldDocument> {
    return this.documentFetcher.fetch(documentKey);
  }

  protected getConnectionKeys(
    criteria: DocumentQueryCriteria,
    document: BoldDocument,
    context: QueryContext,
  ): Array<ConnectionKeys<DocumentQueryCriteria>> {
    const { externalEvents, parentDocumentId } = document;

    const connectionKeys: Array<ConnectionKeys<DocumentQueryCriteria>> = [];

    if (
      isObject(criteria.parentDocument) &&
      isNonEmptyString(parentDocumentId)
    ) {
      const parentDocumentKey = this.getDocumentKey({
        context,
        documentId: parentDocumentId,
      });

      connectionKeys.push({
        criteria: criteria.parentDocument,
        documentKeys: [parentDocumentKey],
      });
    }

    connectionKeys.push(
      ...(criteria.relatedDocuments ?? []).flatMap((criterion) => {
        const { category, subtype, type } = criterion;
        const documentKeys: DocumentKey[] = [];

        const matcher = new DocumentMatcher({
          ...(isNonEmptyString(category) && { category }),
          ...(isNonEmptyString(subtype) && { subtype }),
          ...(isNonEmptyString(type) && { type }),
        });

        for (const event of externalEvents || []) {
          const relationship = this.getEventRelationship(event);

          if (
            isDocumentRelation(relationship) &&
            matcher.matches(relationship)
          ) {
            documentKeys.push(
              this.getDocumentKey({
                context,
                documentId: relationship.documentId,
              }),
            );
          }
        }

        return {
          criteria: criterion,
          documentKeys,
        };
      }),
    );

    return connectionKeys;
  }

  protected getDocumentKey({
    context,
    documentId,
  }: {
    context: QueryContext;
    documentId: string;
  }): DocumentKey {
    return {
      s3Key: toDocumentKey({
        documentId,
        documentKeyPrefix: context.s3KeyPrefix,
      }),
    };
  }

  protected async processFetchedDocument<T = void>({
    callback,
    context,
    criteria,
    document,
  }: {
    callback: (document: Visitor<BoldDocument>) => T;
    context: QueryContext;
    criteria: DocumentQueryCriteria;
    document: BoldDocument;
  }): Promise<T[]> {
    const result: T[] = [];

    if (!isRelatedDocumentCriteria(criteria)) {
      result.push(callback({ document }));
    }

    result.push(
      ...(await this.loadQueryCriteria<T>({
        callback,
        context,
        criteria,
        document,
      })),
    );

    return result;
  }

  private getEventRelationship({
    relatedDocument,
  }: BoldDocumentEvent): BoldDocumentRelation | undefined {
    if (isDocumentRelation(relatedDocument)) {
      return relatedDocument;
    }

    return undefined;
  }
}
```

Key changes from the old version:
1. Old `loadDocument` method is REMOVED.
2. `fetchDocument` is ADDED (a thin wrapper around `this.documentFetcher.fetch(documentKey)`).
3. `processFetchedDocument` is ADDED with the exact post-fetch logic that used to live in `loadDocument`: the `isRelatedDocumentCriteria` check + the recursive `loadQueryCriteria` call.

- [ ] **Step 3: Run existing query service spec — must pass without modification**

Run: `pnpm nx test shared-methodologies-bold-io-helpers`
Expected: All existing tests in `document-query.service.spec.ts` pass. This proves the refactor preserves behavior.

If any test fails:
- Read the failure carefully. Most likely cause: a typo in the refactored code.
- Do NOT change the spec file. The spec defines the desired behavior.
- Fix the source files until tests pass.

- [ ] **Step 4: Run lint + ts**

```
pnpm nx lint shared-methodologies-bold-io-helpers --fix
pnpm nx ts shared-methodologies-bold-io-helpers
```

Both must succeed.

- [ ] **Step 5: Commit**

```bash
git add \
  libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts \
  libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts
git commit -m "$(cat <<'EOF'
refactor(shared): parallelize DocumentQueryService related-doc fetches

Replace the abstract loadDocument split with fetchDocument (pure S3
fetch) + processFetchedDocument (callback + recursion). Rewrite
BaseDocumentQueryService.loadQueryCriteria to drive the new
boundedParallelFetchInOrder primitive, fetching related documents up
to 10 at a time while preserving byte-identical callback invocation
order.

Every existing document-query.service.spec.ts test continues to pass
unchanged: the primitive preserves input order, so vi.spyOn +
mockResolvedValueOnce chains behave identically to the serial
implementation.

Motivation: credit-order/rewards-distribution Lambda times out at 30s
on credit orders with many RecycledID certificates (82s observed
locally for a 118-certificate order). Parallel fetch brings elapsed
time under the Lambda limit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add parallel-semantics tests to the query service spec

**Files:**
- Modify: `libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts`

**Goal:** Add new tests asserting parallel fetch behavior (out-of-order resolution, error propagation) while keeping all existing tests untouched.

- [ ] **Step 1: Read the existing spec to understand its patterns**

Run: `pnpm nx test shared-methodologies-bold-io-helpers --coverage`
Record the current coverage percentages. They should all be 100% after Task 3.

Then inspect the spec imports and the `describe('DocumenQueryService', ...)` structure:

```
head -30 libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts
```

- [ ] **Step 2: Append a new `describe` block for parallel semantics to the spec**

Add this block inside the top-level `describe('DocumenQueryService', () => { ... })` block, AFTER all existing nested `describe` blocks and BEFORE the closing `})`. This follows the exact stubbing pattern used by existing related-document tests (`stubDocument()` + mutating `externalEvents` + `stubDocumentEntity({ document })`).

```ts
  describe('parallel fetch semantics', () => {
    interface Deferred<T> {
      promise: Promise<T>;
      reject: (error: unknown) => void;
      resolve: (value: T) => void;
    }

    const createDeferred = <T>(): Deferred<T> => {
      let resolve!: (value: T) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, reject, resolve };
    };

    it('yields related documents in input order even when loader resolutions arrive out of order', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const rootDocument = stubDocument();
      const child0 = stubDocument();
      const child1 = stubDocument();
      const child2 = stubDocument();

      rootDocument.externalEvents = [
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child0.id,
            subtype,
            type,
          },
        }),
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child1.id,
            subtype,
            type,
          },
        }),
        stubDocumentEvent({
          relatedDocument: {
            category,
            documentId: child2.id,
            subtype,
            type,
          },
        }),
      ];

      const child0Deferred = createDeferred<DocumentEntity<BoldDocument>>();
      const child1Deferred = createDeferred<DocumentEntity<BoldDocument>>();
      const child2Deferred = createDeferred<DocumentEntity<BoldDocument>>();

      vi.spyOn(provideDocumentLoaderService, 'load').mockImplementation(
        async ({ key }) => {
          if (key.includes(rootDocument.id)) {
            return stubDocumentEntity({
              document: rootDocument,
            }) as DocumentEntity<BoldDocument>;
          }
          if (key.includes(child0.id)) return child0Deferred.promise;
          if (key.includes(child1.id)) return child1Deferred.promise;
          if (key.includes(child2.id)) return child2Deferred.promise;
          throw new Error(`Unexpected loader key: ${key}`);
        },
      );

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: { relatedDocuments: [{ category, subtype, type }] },
        documentId: rootDocument.id,
      });

      const visited: string[] = [];
      const mapPromise = loaderDocuments.iterator().map(({ document }) => {
        visited.push(document.id);
        return document.id;
      });

      // Resolve in reverse order
      child2Deferred.resolve(
        stubDocumentEntity({
          document: child2,
        }) as DocumentEntity<BoldDocument>,
      );
      child1Deferred.resolve(
        stubDocumentEntity({
          document: child1,
        }) as DocumentEntity<BoldDocument>,
      );
      child0Deferred.resolve(
        stubDocumentEntity({
          document: child0,
        }) as DocumentEntity<BoldDocument>,
      );

      const result = await mapPromise;

      // Callback invocation order preserves input order
      expect(visited).toEqual([child0.id, child1.id, child2.id]);
      // Result array preserves input order
      expect(result).toEqual([child0.id, child1.id, child2.id]);
    });

    it('propagates a loader rejection through .map()', async () => {
      const { category, subtype, type } = stubDocumentRelation();
      const rootDocument = stubDocument();
      const child = stubDocument();

      rootDocument.externalEvents = [
        stubDocumentEvent({
          relatedDocument: { category, documentId: child.id, subtype, type },
        }),
      ];

      const error = new Error('S3 exploded');

      vi.spyOn(provideDocumentLoaderService, 'load')
        .mockResolvedValueOnce(
          stubDocumentEntity({
            document: rootDocument,
          }) as DocumentEntity<BoldDocument>,
        )
        .mockRejectedValueOnce(error);

      const loaderDocuments = await loadDocuments.load({
        context: stubQueryContext(),
        criteria: { relatedDocuments: [{ category, subtype, type }] },
        documentId: rootDocument.id,
      });

      await expect(
        loaderDocuments.iterator().map(({ document }) => document.id),
      ).rejects.toThrow('S3 exploded');
    });
  });
```

- [ ] **Step 3: Verify required imports**

The new tests use `DocumentEntity`, `BoldDocument`, `stubDocument`, `stubDocumentEntity`, `stubDocumentEvent`, `stubDocumentRelation`, `stubQueryContext`, and `provideDocumentLoaderService`. All are already imported at the top of `document-query.service.spec.ts` (they're used by other tests in the same file).

If `pnpm nx ts shared-methodologies-bold-io-helpers` reports a missing import after adding the new describe block, add it in the same style as the existing imports.

- [ ] **Step 4: Run the full spec**

Run: `pnpm nx test shared-methodologies-bold-io-helpers`
Expected: All existing tests pass + 2 new tests pass.

If any test fails, read the output and fix iteratively. Do not proceed until green.

- [ ] **Step 5: Verify 100% coverage on io-helpers**

Run: `pnpm nx test shared-methodologies-bold-io-helpers --coverage`
Expected: All files at 100% branches/functions/lines/statements.

- [ ] **Step 6: Run lint + ts**

```
pnpm nx lint shared-methodologies-bold-io-helpers --fix
pnpm nx ts shared-methodologies-bold-io-helpers
```

- [ ] **Step 7: Commit**

```bash
git add libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts
git commit -m "$(cat <<'EOF'
test(shared): cover parallel fetch semantics in DocumentQueryService

Add two targeted tests that exercise the behaviors the new
bounded-parallel loadQueryCriteria enables:

1. Out-of-order loader resolutions still yield callbacks and results
   in input order (the order-preservation guarantee).
2. A loader rejection on a child document surfaces as a .map()
   rejection (error propagation).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add canonical actor sort to credit-order rewards-distribution

**Files:**
- Modify: `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.ts`

**Goal:** Add Smaug's canonical actor order as a sort. Apply it in `calculateRewardsDistribution` at the Map-to-array spread.

- [ ] **Step 1: Add the sort order Map and helper function to the top of the helpers file**

Add this block immediately after the existing top-level imports (before `calculateAmount`):

```ts
// Canonical actor order — mirrors smaug/libs/shared/palantir/helpers/src/helpers.ts
// ACTOR_TYPE_SORT_ORDER. Keep in sync with that file when it changes.
const ACTOR_TYPE_SORT_ORDER: ReadonlyMap<RewardsDistributionActorType, number> =
  new Map([
    [RewardsDistributionActorType.WASTE_GENERATOR, 1],
    [RewardsDistributionActorType.HAULER, 2],
    [RewardsDistributionActorType.PROCESSOR, 3],
    [RewardsDistributionActorType.RECYCLER, 4],
    [RewardsDistributionActorType.COMMUNITY_IMPACT_POOL, 5],
    [RewardsDistributionActorType.INTEGRATOR, 6],
    [RewardsDistributionActorType.METHODOLOGY_AUTHOR, 7],
    [RewardsDistributionActorType.METHODOLOGY_DEVELOPER, 8],
    [RewardsDistributionActorType.NETWORK, 9],
  ]);

export const sortRewardsDistributionActors = (
  actors: readonly RewardsDistributionActor[],
): RewardsDistributionActor[] =>
  [...actors].sort((a, b) => {
    const orderA =
      ACTOR_TYPE_SORT_ORDER.get(a.actorType) ?? Number.MAX_SAFE_INTEGER;
    const orderB =
      ACTOR_TYPE_SORT_ORDER.get(b.actorType) ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.participant.id.localeCompare(b.participant.id);
  });
```

You will need to import `RewardsDistributionActor` from the types file. The current import block in `rewards-distribution.helpers.ts` pulls types from `./rewards-distribution.types` — add `RewardsDistributionActor` to that import:

```ts
import type {
  AggregateMassIDCertificateRewards,
  Remainder,
  ResultContentsWithMassIDCertificateValue,
  RewardsDistribution,
  RewardsDistributionActor,
  RuleSubject,
} from './rewards-distribution.types';
```

(Match the alphabetical order used in the existing imports — check the current file and slot `RewardsDistributionActor` into its correct position.)

- [ ] **Step 2: Apply the sort at the return of `calculateRewardsDistribution`**

Locate the existing `return` block in `calculateRewardsDistribution` (around line 225-233):

```ts
  return {
    actors: [...actors.values()],
    creditUnitPrice: creditUnitPrice.toString(),
    massIDCertificateTotalValue: massIDCertificateTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
```

Replace it with:

```ts
  return {
    actors: sortRewardsDistributionActors([...actors.values()]),
    creditUnitPrice: creditUnitPrice.toString(),
    massIDCertificateTotalValue: massIDCertificateTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
```

- [ ] **Step 3: Run the existing rewards-distribution spec file**

Run: `pnpm nx test methodologies-bold-rule-processors-credit-order-rewards-distribution`
Expected: some tests may now fail because they assert an actors array order that reflected the old insertion order. You'll fix them in Task 6. Record which tests fail — you'll need to update their expected arrays.

Do NOT commit yet.

---

## Task 6: Update rewards-distribution helper tests

**Files:**
- Modify: `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.spec.ts`

**Goal:** Add direct tests for `sortRewardsDistributionActors` and update any existing tests whose expected actor array order changed.

- [ ] **Step 1: Inspect the existing helpers spec to find affected tests**

Run:
```
grep -n "actors" libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.spec.ts | head -40
```

Look for any `expect(...).toEqual(...)` or snapshot assertion that includes an `actors` array. Those are candidates for updates.

- [ ] **Step 2: Update any affected existing assertions**

For each assertion that compares an actors array, reorder the expected values to match the canonical sort:

Canonical order:
1. Waste Generator
2. Hauler
3. Processor
4. Recycler
5. Community Impact Pool
6. Integrator
7. Methodology Author
8. Methodology Developer
9. Network

Tiebreak among same-type actors: `participant.id.localeCompare`.

If there are snapshot tests (`toMatchSnapshot`), update the snapshot with `pnpm nx test methodologies-bold-rule-processors-credit-order-rewards-distribution -u` AFTER manually verifying the new snapshot matches the canonical order (review the diff before accepting).

- [ ] **Step 3: Add new `describe` block for `sortRewardsDistributionActors`**

Append this block inside the top-level `describe` block of `rewards-distribution.helpers.spec.ts`, at the end (before the final `})`):

```ts
  describe('sortRewardsDistributionActors', () => {
    const makeActor = (
      actorType: RewardsDistributionActorType,
      participantId = 'participant-1',
    ): RewardsDistributionActor => ({
      actorType,
      address: { id: 'address-1' },
      amount: '10',
      participant: { id: participantId, name: 'Test Participant' },
      percentage: '10',
    });

    it('sorts actors into the canonical order regardless of input order', () => {
      const input = [
        makeActor(RewardsDistributionActorType.NETWORK),
        makeActor(RewardsDistributionActorType.COMMUNITY_IMPACT_POOL),
        makeActor(RewardsDistributionActorType.WASTE_GENERATOR),
        makeActor(RewardsDistributionActorType.METHODOLOGY_DEVELOPER),
        makeActor(RewardsDistributionActorType.HAULER),
        makeActor(RewardsDistributionActorType.METHODOLOGY_AUTHOR),
        makeActor(RewardsDistributionActorType.PROCESSOR),
        makeActor(RewardsDistributionActorType.INTEGRATOR),
        makeActor(RewardsDistributionActorType.RECYCLER),
      ];

      const sorted = sortRewardsDistributionActors(input);

      expect(sorted.map((actor) => actor.actorType)).toEqual([
        RewardsDistributionActorType.WASTE_GENERATOR,
        RewardsDistributionActorType.HAULER,
        RewardsDistributionActorType.PROCESSOR,
        RewardsDistributionActorType.RECYCLER,
        RewardsDistributionActorType.COMMUNITY_IMPACT_POOL,
        RewardsDistributionActorType.INTEGRATOR,
        RewardsDistributionActorType.METHODOLOGY_AUTHOR,
        RewardsDistributionActorType.METHODOLOGY_DEVELOPER,
        RewardsDistributionActorType.NETWORK,
      ]);
    });

    it('breaks ties between actors of the same type by participant id', () => {
      const input = [
        makeActor(RewardsDistributionActorType.WASTE_GENERATOR, 'zebra'),
        makeActor(RewardsDistributionActorType.WASTE_GENERATOR, 'apple'),
        makeActor(RewardsDistributionActorType.WASTE_GENERATOR, 'mango'),
      ];

      const sorted = sortRewardsDistributionActors(input);

      expect(sorted.map((actor) => actor.participant.id)).toEqual([
        'apple',
        'mango',
        'zebra',
      ]);
    });

    it('does not mutate the input array', () => {
      const input = [
        makeActor(RewardsDistributionActorType.NETWORK),
        makeActor(RewardsDistributionActorType.WASTE_GENERATOR),
      ];
      const originalOrder = input.map((actor) => actor.actorType);

      sortRewardsDistributionActors(input);

      expect(input.map((actor) => actor.actorType)).toEqual(originalOrder);
    });

    it('assigns a sort order to every RewardsDistributionActorType', () => {
      // Pins the "add a new actor type but forget to update the sort Map"
      // failure mode. The sort helper falls back to MAX_SAFE_INTEGER for
      // unknown types, so this test would pass silently without this check.
      const allTypes = Object.values(RewardsDistributionActorType);

      const actors = allTypes.map((actorType) => makeActor(actorType));
      const sorted = sortRewardsDistributionActors(actors);

      // If any type lacks a sort order, it gets MAX_SAFE_INTEGER and lands at
      // the end — but we want EVERY type to have an explicit order. Assert
      // the sorted output includes every input type.
      expect(sorted).toHaveLength(allTypes.length);

      // And explicitly assert none landed in the MAX_SAFE_INTEGER fallback.
      // We do this by constructing a unique-order set: if every type has a
      // sort order 1..9, the sort is fully deterministic and the output order
      // matches the canonical sequence above. We re-run the first test's
      // assertion here as a completeness check.
      expect(sorted[0]!.actorType).toBe(
        RewardsDistributionActorType.WASTE_GENERATOR,
      );
      expect(sorted[sorted.length - 1]!.actorType).toBe(
        RewardsDistributionActorType.NETWORK,
      );
    });
  });
```

- [ ] **Step 4: Check and add required imports to the spec file**

The new tests use `RewardsDistributionActor`, `RewardsDistributionActorType`, and `sortRewardsDistributionActors`. Ensure they're imported at the top of the spec file:

```ts
import {
  RewardsDistributionActorType,
  type RewardsDistributionActor,
} from '@carrot-fndn/shared/methodologies/bold/types';
```

And from the local helpers file:

```ts
import {
  // ... existing imports ...
  sortRewardsDistributionActors,
} from './rewards-distribution.helpers';
```

Add these imports if missing. If they're already imported for other tests, leave them alone.

- [ ] **Step 5: Run the helpers spec**

Run: `pnpm nx test methodologies-bold-rule-processors-credit-order-rewards-distribution`
Expected: All tests pass — both the pre-existing ones (updated in Step 2) and the 4 new sort tests.

If any existing test still fails, inspect the output: it likely asserts an actors-array order that needs updating. Update the assertion and rerun.

- [ ] **Step 6: Verify 100% coverage**

Run: `pnpm nx test methodologies-bold-rule-processors-credit-order-rewards-distribution --coverage`
Expected: All files at 100%.

- [ ] **Step 7: Run lint + ts**

```
pnpm nx lint methodologies-bold-rule-processors-credit-order-rewards-distribution --fix
pnpm nx ts methodologies-bold-rule-processors-credit-order-rewards-distribution
```

- [ ] **Step 8: Commit**

```bash
git add \
  libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.ts \
  libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.spec.ts
git commit -m "$(cat <<'EOF'
fix(rule): pin credit-order rewards-distribution actors to canonical order

Apply Smaug's canonical actor sort
(smaug/libs/shared/palantir/helpers/src/helpers.ts:64-74) at the end
of calculateRewardsDistribution, making the output actors array
deterministic regardless of the order in which related MassID
certificate documents were fetched.

This decouples the rule output from the fetch-completion order,
which becomes non-deterministic under the new bounded-parallel
loadQueryCriteria (while still being numerically identical).

Includes a sort-order completeness test that fails if a new
RewardsDistributionActorType is added without updating the Map.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full verification across affected projects

**Goal:** Before touching the processor's debug logs or running the production repro, confirm the whole chain is green.

- [ ] **Step 1: Run all affected tests**

```
pnpm nx run-many --target=test --projects=shared-helpers,shared-methodologies-bold-io-helpers,methodologies-bold-rule-processors-credit-order-rewards-distribution
```

Expected: all green.

- [ ] **Step 2: Run all affected lint**

```
pnpm nx run-many --target=lint --projects=shared-helpers,shared-methodologies-bold-io-helpers,methodologies-bold-rule-processors-credit-order-rewards-distribution
```

Expected: no errors.

- [ ] **Step 3: Run all affected typecheck**

```
pnpm nx run-many --target=ts --projects=shared-helpers,shared-methodologies-bold-io-helpers,methodologies-bold-rule-processors-credit-order-rewards-distribution
```

Expected: no errors.

- [ ] **Step 4: Run the full repo test suite to catch any silent ripple effect**

```
pnpm nx run-many --target=test --all
```

Expected: all green. This is the ultimate safety net — any rule that silently depended on fetch-completion order would surface here. Spec analysis says zero rules depend on it, but verify empirically.

If anything fails, stop. Read the failure. The most likely culprit is a test elsewhere in the monorepo that used `mockResolvedValueOnce` with an ordering assumption the spec audit missed. Do NOT advance until the full suite is green.

- [ ] **Step 5: No commit — this is a verification checkpoint only.**

---

## Task 8: Production repro with instrumentation still in place

**Goal:** Validate the production fix end-to-end WITH the existing debug logs so we can see per-certificate timings in the new parallel world.

- [ ] **Step 1: Run the production repro**

```
aws-vault exec smaug-prod -- pnpm run-rule \
  libs/methodologies/bold/rule-processors/credit-order/rewards-distribution \
  --methodology-execution-id 104a09fc-b58d-4e2c-893e-7bd27495e81a \
  --audit-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
  --audited-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
  --config '{"match":{"category":"Methodology","type":"RecycledID"}}' \
  --debug
```

Expected:
- `Status: ✓ PASSED`
- Elapsed time ~8–10s (vs. ~82s previously)
- Result content: numerically identical to the previous run (same amounts, percentages, creditUnitPrice, massIDCertificateTotalValue, remainder)
- Actor array in canonical order: Waste Generator × 2, Hauler, Processor, Recycler, Community Impact Pool, Integrator, Methodology Author, Methodology Developer, Network
- Debug logs show many per-certificate-processed entries clustering tightly in time (parallel fetch landing in bursts of ~10) rather than the previous ~700ms-apart pattern

- [ ] **Step 2: Record the elapsed time and actor array in your implementation notes**

This is the primary verification — the real production data proves the primitive works correctly against real S3 latency.

- [ ] **Step 3: No commit — verification checkpoint only.**

---

## Task 9: Revert the temporary debug logs from the processor

**Files:**
- Modify: `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts`

**Goal:** Return `rewards-distribution.processor.ts` to its pre-investigation state now that the bottleneck is fixed. The instrumentation was exploratory and doesn't belong in the permanent code.

- [ ] **Step 1: Restore the file from `main`**

```
git checkout main -- libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts
```

This overwrites the local working copy with the version from `main`, cleanly removing every `logger.debug({...}, '[rewards-distribution] ...')` call we added during investigation.

- [ ] **Step 2: Verify the diff shows only removals**

```
git diff --cached libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts
```

Expected: only `logger.debug` lines and the `logger` import removed. No other changes. If you see additions or unrelated modifications, stop and investigate — something went wrong.

- [ ] **Step 3: Run the processor tests**

```
pnpm nx test methodologies-bold-rule-processors-credit-order-rewards-distribution
```

Expected: all pass (debug logs were in the processor file, not the helpers; removing them doesn't affect the helpers tests from Task 6).

- [ ] **Step 4: Run lint + ts**

```
pnpm nx lint methodologies-bold-rule-processors-credit-order-rewards-distribution --fix
pnpm nx ts methodologies-bold-rule-processors-credit-order-rewards-distribution
```

- [ ] **Step 5: Commit**

```bash
git add libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts
git commit -m "$(cat <<'EOF'
chore(rule): revert temporary debug logs from rewards-distribution processor

These logs were added during the investigation that identified the
serial S3-fetch bottleneck in DocumentQueryService.loadQueryCriteria.
Now that the bottleneck is fixed at the shared service layer via
boundedParallelFetchInOrder, the exploratory instrumentation belongs
off the permanent code path.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final verification and PR prep

**Goal:** Run the full suite one last time against the final state, confirm everything is green, prepare the PR body.

- [ ] **Step 1: Run full test suite**

```
pnpm nx run-many --target=test --all
```

Expected: all green.

- [ ] **Step 2: Run full lint**

```
pnpm nx run-many --target=lint --all
```

Expected: no errors.

- [ ] **Step 3: Run full typecheck**

```
pnpm nx run-many --target=ts --all
```

Expected: no errors.

- [ ] **Step 4: Verify git log shows the expected commits**

```
git log --oneline main..HEAD
```

Expected (in order from earliest to latest):
1. `docs(shared): bounded-parallel document fetch in DocumentQueryService` (spec)
2. `docs(shared): refine bounded-parallelism spec after deep review` (spec v2)
3. `feat(shared): add boundedParallelFetchInOrder primitive`
4. `refactor(shared): parallelize DocumentQueryService related-doc fetches`
5. `test(shared): cover parallel fetch semantics in DocumentQueryService`
6. `fix(rule): pin credit-order rewards-distribution actors to canonical order`
7. `chore(rule): revert temporary debug logs from rewards-distribution processor`

- [ ] **Step 5: Prepare PR body notes**

Draft the following content for the PR description (do not open the PR yet — wait for user approval):

```markdown
## Summary

- Adds `boundedParallelFetchInOrder` primitive to `libs/shared/helpers` — a pure async-generator pool with concurrency cap and in-order consumption.
- Refactors `DocumentQueryService.loadQueryCriteria` to fetch related documents in parallel (cap 10) via the primitive, splitting the old `loadDocument` into `fetchDocument` (pure S3 fetch) + `processFetchedDocument` (callback + recursion).
- Preserves byte-identical callback invocation order and result arrays for every existing rule — audited all 8 `iterator().map|each` callsites.
- Applies Smaug's canonical actor sort at the return of credit-order rewards-distribution's `calculateRewardsDistribution`, pinning the output actors array independent of fetch order.
- Reverts the temporary debug logs added during the bottleneck investigation.

## Impact

- **Before:** credit-order rewards-distribution Lambda times out at 30s on the 118-certificate prod execution. Local repro: ~82s.
- **After:** local repro drops to ~8–10s (measured on the same prod execution).

## Test plan

- [ ] `pnpm nx run-many --target=test --all` (full suite, 100% coverage enforced)
- [ ] `pnpm nx run-many --target=lint --all`
- [ ] `pnpm nx run-many --target=ts --all`
- [ ] Production repro on execution `104a09fc-b58d-4e2c-893e-7bd27495e81a` shows PASSED, numerically identical result, canonical actor order, ~8-10s elapsed

## Design docs

- Spec: `docs/superpowers/specs/2026-04-09-document-query-bounded-parallelism-design.md`
- Plan: `docs/superpowers/plans/2026-04-09-document-query-bounded-parallelism.md`
```

- [ ] **Step 6: Do not open the PR.** Wait for explicit user approval to push + open PR. Report readiness to the user instead.

---

## Known limitations (documented, not in scope)

- **Recursive depth concurrency amplification.** Each recursive `loadQueryCriteria` call has its own local pool of 10. For effective depth `d`, the total in-flight count can reach `d × 10`. All current callers have depth 1, so the practical cap stays at 10. Fix if ever needed: thread a single shared limiter through recursive calls.
- **No fetch cancellation.** The underlying `DocumentLoader` doesn't support `AbortSignal`. On error, in-flight fetches run to completion and their results are discarded. Transient memory is bounded by `concurrency × sizeof(Document)` and self-cleans.
- **Smaug canonical sort is duplicated, not imported.** Cross-repo imports aren't a pattern here. Test #4 (sort-order completeness) catches forgotten additions.
- **mass-id-certificate rewards-distribution processor** uses a different actor order (`Object.values(RewardsDistributionActorType)` iteration order — alphabetical by enum key). This is pre-existing, deterministic, and unaffected by this change. Downstream consumers (Palantir) re-sort via Smaug's order before display.
