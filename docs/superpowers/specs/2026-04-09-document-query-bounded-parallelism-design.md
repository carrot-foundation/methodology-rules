# Design: Bounded-parallel document fetch in `DocumentQueryService`

**Date:** 2026-04-09
**Status:** Approved — ready for implementation planning
**Branch:** `perf/document-query-bounded-parallelism`

## Files touched

| Path | Change |
|---|---|
| `libs/shared/helpers/src/bounded-parallel.helpers.ts` | **New.** Pure async-iterator primitive: bounded-concurrency parallel fetch with in-order consumption. |
| `libs/shared/helpers/src/bounded-parallel.helpers.spec.ts` | **New.** Unit tests for the primitive (100% branch coverage). |
| `libs/shared/helpers/src/index.ts` | Export the new helper. |
| `libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts` | Refactor `loadQueryCriteria` to consume the primitive. Replace abstract `loadDocument` with abstract `fetchDocument` + abstract `processFetchedDocument`. |
| `libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts` | Split concrete `loadDocument` into `fetchDocument` (pure fetch) + `processFetchedDocument` (callback + recursion). |
| `libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts` | Add parallel-semantics tests (order preservation, concurrency cap, memory cap, error propagation). Keep all existing tests green. |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.ts` | Add canonical actor sort, apply at end of `aggregateMassIDCertificatesRewards`. |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.spec.ts` | Add shuffled-input determinism test; update any affected assertions. |
| `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.processor.ts` | **Revert** the temporary debug logs added during the earlier investigation. Not in scope otherwise. |

## Context

`DocumentQueryService.loadQueryCriteria` in `abstract-document-query.service.ts:87-117` walks related documents serially: every S3 fetch awaits the previous one's completion. For rules that fan out to many related documents, this dominates wall-clock time.

**Measured impact (production credit-order rewards-distribution, execution `104a09fc-b58d-4e2c-893e-7bd27495e81a`):**

- 118 `RecycledID` certificates, each fetch ~700ms, CPU work ~1ms
- Total elapsed: ~82s
- Lambda prod timeout is 30s → rule currently times out in production

## Goals

1. Make `loadQueryCriteria` fetch related documents in parallel with a fixed upper bound of **10 concurrent S3 requests**.
2. Preserve exact output semantics for **every** existing rule — result arrays and callback invocation order must be byte-identical to serial today.
3. Enforce a strict memory cap: **at most 10 in-flight-or-buffered documents per `loadQueryCriteria` call**, with immediate release of each document's reference as the walker consumes it. No unbounded buffering. No leaks.
4. Maintain the project's **100% coverage threshold** (`.vitest/config/vitest.base.config.ts:119-124` — `branches/functions/lines/statements: 100`) on every file touched.
5. Independently, make `credit-order/rewards-distribution`'s output actor array deterministic via a canonical sort (port Smaug's order).
6. Revert the temporary `[rewards-distribution]` debug logs added during the earlier investigation.

## Non-goals

- Adding external dependencies (`p-map`, `p-limit`, etc.) — we hand-roll the primitive.
- Making concurrency user-configurable per-call. Hardcoded `10` with a named, exported constant.
- Cross-level concurrency cap for nested recursive criteria. All current callers have effective depth 1; documented as a known limitation with a path forward if needed.
- Fetch cancellation via `AbortSignal`. The underlying `DocumentLoader` doesn't support it today, and the bounded transient references during error unwind are acceptable (see "Memory during error unwind" below).
- Changing the public `iterator().map|each` API. Callers are unchanged.

## Order-dependence audit

Every `iterator().map|each` callsite across the codebase was audited. Three patterns:

| Processor | Pattern | Order matters? |
|---|---|---|
| credit-order/rewards-distribution | `.map()` → sum via `aggregateMassIDCertificatesRewards` | Amounts: no (commutative BigNumber addition). Actor array output order: yes (Map insertion order) — fixed independently by canonical sort. |
| mass-id-certificate/rewards-distribution | `.each()` → 3 singleton slots | No (one-of-each by design) |
| mass-id/geolocation-and-address-precision | `.each()` → push to `accreditationDocuments[]` + singleton | Possibly — but preserved by this design |
| mass-id/weighing | `.each()` → 2 singleton slots | No (one-of-each) |
| mass-id/prevented-emissions | `.each()` → 2 singleton slots | No (one-of-each) |
| mass-id/participant-accreditations-and-verifications-requirements | `.each()` → `Map<participantId, BoldDocument[]>` push | Possibly — but preserved by this design |
| mass-id/no-conflicting-certificate-or-credit | `.each()` → 3 push arrays | Possibly — but preserved by this design |
| mass-id/mass-id-sorting | `.each()` → 2 singleton slots | No (one-of-each) |

**Key insight:** the design preserves *callback invocation order* regardless of fetch completion order. Rules with push-order dependencies are safe because pushes happen in the walker's serial phase, not in the parallel fetch phase.

## Architecture

Three layers:

1. **`boundedParallelFetchInOrder` (new primitive)** — pure async generator in `libs/shared/helpers`. Given `tasks`, a `fetchOne(task, i)` function, and a `concurrency` cap, yields `{ task, value, index }` in input order while holding at most `concurrency` values in memory (in-flight + buffered combined).
2. **`BaseDocumentQueryService.loadQueryCriteria` (refactored)** — flattens `connections` into a stable task list, then drives the primitive via `for await`. For each yielded document, delegates to `processFetchedDocument` for callback + recursion.
3. **`DocumentQueryService` (concrete)** — implements `fetchDocument` (pure S3 fetch + validation) and `processFetchedDocument` (the post-fetch half of the old `loadDocument`).

### The primitive

```ts
// libs/shared/helpers/src/bounded-parallel.helpers.ts

export const DEFAULT_FETCH_CONCURRENCY = 10;

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
          // Wake every waiter so the walker can surface the error immediately.
          for (const notify of notifiers.values()) notify();
          notifiers.clear();
        });
    }
  };

  dispatch();

  for (let i = 0; i < tasks.length; i += 1) {
    if (!fetched.has(i) && fatalError === undefined) {
      await new Promise<void>((resolve) => {
        notifiers.set(i, resolve);
      });
    }
    if (fatalError !== undefined) {
      throw fatalError.error;
    }

    const value = fetched.get(i) as Value;
    fetched.delete(i);   // release reference *before* yielding
    dispatch();           // refill the pipeline

    yield { index: i, task: tasks[i]!, value };
  }
}
```

**Why wrap `fatalError` in an object:** distinguishes "no error set yet" (`undefined`) from "error that happens to be `undefined`" (a legitimate but weird value a rejected promise could carry). Cleaner than sentinels.

**Why check `fatalError === undefined` before awaiting the notifier:** if an error has already been captured before the walker reaches this iteration (e.g. a later slot rejected while the walker was processing an earlier one), the walker should skip the wait and throw immediately rather than hanging.

### Refactored `loadQueryCriteria`

```ts
// abstract-document-query.service.ts (excerpt)

protected async loadQueryCriteria<T = void>({
  callback,
  context,
  criteria,
  document,
}: {
  callback: (document: Visitor<Document>) => T;
  context: QueryContext;
  criteria: Criteria;
  document: Document;
}): Promise<T[]> {
  const connections = this.getConnectionKeys(criteria, document, context);

  type Task = { criterion: Criteria; documentKey: DocumentKey };
  const tasks: Task[] = [];
  for (const { criteria: criterion, documentKeys } of connections) {
    for (const documentKey of documentKeys) {
      tasks.push({ criterion, documentKey });
    }
  }

  const results: T[] = [];
  for await (const { task, value: fetchedDocument } of boundedParallelFetchInOrder(
    tasks,
    async (task) => this.fetchDocument(task.documentKey),
    DEFAULT_FETCH_CONCURRENCY,
  )) {
    const nested = await this.processFetchedDocument<T>({
      callback,
      context,
      criteria: task.criterion,
      document: fetchedDocument,
    });
    results.push(...nested);
  }

  return results;
}

protected abstract fetchDocument(
  documentKey: DocumentKey,
): Promise<Document>;

protected abstract processFetchedDocument<T = void>(params: {
  callback: (document: Visitor<Document>) => T;
  context: QueryContext;
  criteria: Criteria;
  document: Document;
}): Promise<T[]>;
```

### Refactored `DocumentQueryService`

```ts
// document-query.service.ts (excerpt)

protected async fetchDocument(
  documentKey: DocumentKey,
): Promise<BoldDocument> {
  return this.documentFetcher.fetch(documentKey);
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
```

Note: the old concrete `loadDocument` is removed. Its logic is split byte-for-byte between `fetchDocument` (the S3 call + validation, which already lives inside `this.documentFetcher.fetch`) and `processFetchedDocument` (the callback-invocation + recursive `loadQueryCriteria` — identical to the old code minus the upfront fetch).

## Memory invariant (the strict cap)

**Invariant:** `inFlightCount + fetched.size ≤ concurrency` at every observable point.

- Workers only fire new fetches when `dispatch` sees `inFlightCount + fetched.size < concurrency`.
- When a fetch completes, it moves `inFlight → fetched` (sum unchanged). `dispatch` is NOT called in the `.then` handler — no new slot opens merely because a fetch landed. The new slot opens only when the walker consumes.
- When the walker consumes `fetched[i]`, it **immediately deletes the entry**, then calls `dispatch`. `fetched.size` drops → the invariant has slack → a new fetch fires.

**Worst-case trace (`concurrency = 10`, slot 0 is slow):**

```
t0:  dispatch()  → fires 0..9
     inFlight={0..9},  fetched={}        total=10  ✓
t1:  slots 1..9 complete before slot 0
     inFlight={0},     fetched={1..9}    total=10  ✓  (no new dispatch)
t2:  slot 0 finally completes
     inFlight={},      fetched={0..9}    total=10  ✓  (no new dispatch)
t3:  walker awakens, consumes doc 0
       fetched.delete(0)       → size=9
       dispatch()              → fires slot 10
     inFlight={10},    fetched={1..9}    total=10  ✓
     yield doc 0                         ← caller receives it
t4:  walker consumes doc 1, dispatch fires slot 11
     inFlight={10,11}, fetched={2..9}    total=10  ✓
     ... steady state at 10 ...
```

**No unbounded accumulation.** No `fetchPromises` array is held across iterations (the classic leak in naïve implementations: a pre-allocated array of resolved promises retains all resolved values until the array itself is GC'd). The walker's `fetched.delete(i)` after each consumption is the release point.

**Number of Document references held simultaneously at a single level:** at most `concurrency + 1` — the `+1` is the document currently being walked, held in the `value` local while the caller consumes the yield. After the caller's processing (callback + recursion) returns and the generator resumes, the local `value` goes out of scope before the next iteration's `fetched.get`.

### Memory during error unwind

When a fetch rejects or the walker throws from its own code (inside `callback` or recursive `loadQueryCriteria`):

1. The generator's `try/finally` semantics mean the `for` loop exits. The generator is abandoned.
2. Pending in-flight fetches are **not cancelled** (no AbortSignal support). Their `.then`/`.catch` closures hold references to `fetched`, `notifiers`, and `inFlightCount` via closure capture. These closures keep the Maps alive.
3. Each fetch that completes or rejects runs its handler (which sets `fetched[i]` or updates `fatalError`). Once the last pending fetch settles, the last closure is released, and the Maps (plus any docs they still hold) become unreachable and are GC'd.

**Transient memory during unwind:** bounded by `concurrency × sizeof(Document)`. Self-cleans in at most the duration of the longest outstanding S3 fetch. **Not a leak** — but documented so future readers don't misread the pattern.

### Across call-stack depth

Each recursive `loadQueryCriteria` call has its own local state (own `fetched`, own `inFlightCount`, own generator). With effective depth `d`, the total Document references in memory across the whole stack is at most `d × (concurrency + 1)`.

All current callers have effective depth 1 (the leaf criterion has no nested `relatedDocuments`, so the recursive call into `loadQueryCriteria` returns an empty result immediately without fetching anything). Peak memory per call is therefore `~11` Documents, which on a 50 KB/doc heuristic is well under 1 MB — negligible on a 512 MB+ Lambda.

For hypothetical future callers with deeper nesting, a single shared limiter threaded through recursive calls would cap the total. Documented as a known limitation, not in scope.

## Actors array determinism (rewards-distribution)

**Problem:** `calculateRewardsDistribution` in `rewards-distribution.helpers.ts:195-234` returns `actors: [...actors.values()]` at line 226 — Map insertion order — which today happens to be deterministic only because fetches are serial. The Map itself is built by `aggregateMassIDCertificatesRewards` in fetch order and subsequently mutated in-place by `addParticipantRemainder`, so the final spread-to-array is where ordering becomes observable.

**Fix:** Port Smaug's canonical actor sort from `smaug/libs/shared/palantir/helpers/src/helpers.ts:64-74`:

```ts
// In rewards-distribution.helpers.ts

// Canonical actor order — mirrors smaug/libs/shared/palantir/helpers/src/helpers.ts
// ACTOR_TYPE_SORT_ORDER. Keep in sync.
const ACTOR_TYPE_SORT_ORDER: ReadonlyMap<RewardsDistributionActorType, number> = new Map([
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

const sortRewardsDistributionActors = (
  actors: readonly RewardsDistributionActor[],
): RewardsDistributionActor[] =>
  // Use spread + sort for consistency with the rest of the codebase — Array.toSorted
  // is available under lib: es2023 but is not used elsewhere in this repo.
  [...actors].sort((a, b) => {
    const orderA = ACTOR_TYPE_SORT_ORDER.get(a.actorType) ?? Number.MAX_SAFE_INTEGER;
    const orderB = ACTOR_TYPE_SORT_ORDER.get(b.actorType) ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) return orderA - orderB;

    // Tiebreak for multiple actors of the same type (e.g. two waste generators)
    return a.participant.id.localeCompare(b.participant.id);
  });
```

Apply it at the return of `calculateRewardsDistribution` (the function that spreads the Map to an array):

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

`aggregateMassIDCertificatesRewards`'s return shape is unchanged — it still hands back the raw `ActorsByType` Map, which `calculateRemainder` and `addParticipantRemainder` continue to mutate by reference. The sort is applied only at the final spread.

**Enum/string equivalence** has already been verified: `RewardsDistributionActorType` in `libs/shared/methodologies/bold/types/src/rewards-distribution.types.ts:8-18` is a `const` object whose values are the same strings Smaug uses (`'Community Impact Pool'`, `'Hauler'`, etc.). Using the const keys in the sort Map is type-safe — TypeScript catches any drift if an enum value is added, removed, or renamed. A runtime test (#18 below) additionally asserts that every `RewardsDistributionActorType` value has a sort order assigned, so forgetting to update the Map after adding a new actor type fails loudly.

**Pre-existing inconsistency noted (not in scope):** the mass-id-certificate rewards-distribution processor (`libs/methodologies/bold/rule-processors/mass-id-certificate/rewards-distribution/src/rewards-distribution.processor.ts:233`) emits actors in `Object.values(RewardsDistributionActorType)` iteration order — alphabetical by enum key — which differs from Smaug's canonical order. This is already deterministic and not affected by the concurrency change, so we leave it alone. Downstream consumers (Palantir) re-sort via `sortRewardDistributionActors` before display, so neither the existing mass-id-certificate order nor the new credit-order sort order is user-visible; they only affect direct rule-output consumers (tests, logs). Bringing the two processors into alignment is a separate cleanup.

## Tests

### Primitive tests (`bounded-parallel.helpers.spec.ts`)

The primitive is pure, has no external deps, and is the core of the memory/concurrency guarantees. Test it exhaustively in isolation. Use controllable deferred promises:

```ts
const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};
```

**Branch enumeration (every branch MUST be covered to keep 100%):**

| Branch | Test |
|---|---|
| `tasks.length === 0` (empty) | 1. Empty input → generator yields nothing, no fetches initiated. |
| `tasks.length === 1` (single) | 2. Single task → one fetch, one yield. |
| `tasks.length === concurrency` | 3. Exact fit → all dispatched up front, no refill needed. |
| `tasks.length > concurrency` | 4. Main case → steady-state refill, peak in-flight === concurrency. |
| `dispatch` exits because `fatalError` set | Covered by error tests below. |
| `dispatch` exits because `inFlightCount + fetched.size >= concurrency` | Covered by test 4 (main case). |
| `dispatch` exits because `nextDispatch >= tasks.length` | Covered by test 1/2/3 (small inputs). |
| `.then` branch: `notifiers.get(i)` defined (waiter present) | 5. Walker blocked on slot 0, slot 0 lands late → waiter fires. |
| `.then` branch: `notifiers.get(i)` undefined (no waiter) | 6. Slot 5 lands while walker is still at slot 0 → no waiter at slot 5 yet. |
| `.catch` branch: `fatalError === undefined` (first error) | 7. Single rejection → walker throws that error. |
| `.catch` branch: `fatalError !== undefined` (subsequent error) | 8. Two rejections → walker throws the FIRST. |
| Walker `fetched.has(i)` true (skip wait) | Covered by test 6. |
| Walker `fetched.has(i)` false (wait for notifier) | Covered by test 5. |
| Walker `fatalError === undefined` (no error skip) | Covered by all happy-path tests. |
| Walker `fatalError !== undefined` (throw) | Covered by tests 7, 8. |
| Walker wakes via error flush while still awaiting | 9. Slot 0 still pending, slot 1 rejects → walker awakens via flush, throws slot-1 error. |

**Memory invariant test (the key guarantee):**

10. **Cap enforced: never more than `concurrency` calls outstanding.** Drive 25 tasks with `concurrency=10`. Track `fetchOne` invocation count minus completion count via a counter incremented on entry and decremented in a `finally` wrapper. Assert the counter never exceeds 10 across the whole run. **This directly exercises the `inFlightCount + fetched.size ≤ concurrency` invariant from outside the primitive** — no need to reach into its internals.

11. **Walker-blocks-pipeline cap.** Drive 15 tasks with `concurrency=10` and deferred promises. Do not resolve anything. Assert exactly 10 fetches are initiated (not 11, not 15). Resolve slots 1..9. Assert still exactly 10 fetches have been initiated (walker blocked on slot 0). Resolve slot 0. Assert eventually slots 10..14 are initiated in order as the walker drains. Combined with test 10, this proves the "no accumulation beyond 10" guarantee.

**Out-of-order completion test:**

12. Tasks 0..4, with deferreds. Resolve in order 4, 3, 2, 1, 0. Assert the walker yields in order 0, 1, 2, 3, 4. Assert `value` passed to each yield matches the correct task. This is the critical order-preservation test.

### Query service tests (`document-query.service.spec.ts`)

13. **Preserve all 14 existing tests as-is.** They use `vi.spyOn(provideDocumentLoaderService, 'load').mockResolvedValueOnce(...)` chains. `mockResolvedValueOnce` pops in CALL-initiation order, which our design preserves (dispatch fires tasks in stable order). No existing test should need changes. **Verify this assumption with a test run** before declaring the refactor complete.

14. **New parallel-semantics test.** Construct a fake root document with 20 related documents. Use a custom spy that returns deferred promises (via `createDeferred` above). Assert:
    - Initial 10 fetches fire before any await resolves.
    - Resolving slots 1..9 while 0 is pending does NOT fire slots 10+.
    - After slot 0 resolves and walker consumes, slot 10 fires.
    - `.map()` result array is in input order even when resolutions are out of order.

15. **New error-propagation test.** One of the 20 related-doc fetches rejects with a specific error. Assert:
    - `.map()` returns a rejected promise with that exact error.
    - The walker does not hang.

### Rewards-distribution tests (`rewards-distribution.helpers.spec.ts`)

16. **Canonical actor order test.** Construct an input with actors in arbitrary order (reversed, shuffled). Assert the output's `actors` array is always in canonical order regardless of input.

17. **Tiebreaker test.** Two actors of type `WASTE_GENERATOR` with different `participant.id`s. Assert the tiebreak is stable (lexicographic on `participant.id`).

18. **Sort-order completeness test.** Iterate `Object.values(RewardsDistributionActorType)` and assert every value is present as a key in `ACTOR_TYPE_SORT_ORDER`. Also assert `ACTOR_TYPE_SORT_ORDER.size === Object.values(RewardsDistributionActorType).length`. This catches the "someone added a new actor type and forgot to update the sort Map" failure mode — including implicit drift from Smaug if the canonical order is extended there first.

19. **Update affected existing tests.** Any test that asserted the actors array in its previous insertion-order must be updated to match the canonical order.

### Rewards-distribution processor (`rewards-distribution.processor.ts`)

20. No new tests — the file reverts to its pre-investigation state (just remove the temporary debug logs).

### Full suite

21. **Run `pnpm nx test` across all affected projects** and **`pnpm nx test` across the full repo** (or at least all rule processors) to catch any silent dependency on today's fetch order. Expected: zero failures. If any fail, investigate — most likely they rely on `mockResolvedValueOnce` call-order semantics we haven't foreseen.

22. **Run `pnpm nx lint <affected>` and `pnpm nx ts <affected>`** per the project's pre-commit policy (user global CLAUDE.md).

## Coverage verification

The project enforces **100% branches / functions / lines / statements** via `.vitest/config/vitest.base.config.ts:119-124`. Any uncovered branch fails the test suite automatically.

**Per-file coverage checklist (to be executed during implementation, not in the spec):**

- `bounded-parallel.helpers.ts` — every branch enumerated in tests 1-12 above.
- `abstract-document-query.service.ts` — the refactored `loadQueryCriteria` has fewer branches than before (the inner `for...of` is gone, replaced by `for await`). Every remaining branch is covered by existing tests 13 plus new tests 14-15.
- `document-query.service.ts` — `fetchDocument` is a thin delegator (likely 1-2 lines, no branches). `processFetchedDocument` has one branch (`isRelatedDocumentCriteria`) already covered by existing tests.
- `rewards-distribution.helpers.ts` — new `sortRewardsDistributionActors` and its tiebreak covered by tests 16-18.

**Implementation rule:** after each file edit, run `pnpm nx test <project>` locally. Any coverage drop fails the build. Do not move to the next file until the current file is at 100%.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| A rule's `.each()` callback has a subtle side-effect order dependency not caught in the audit | The order-preservation invariant (callback invoked in input order) makes this structurally impossible |
| Refactor breaks the single internal caller of old `loadDocument` | It's only called from `loadQueryCriteria` itself — replacing both in the same refactor is atomic |
| `mockResolvedValueOnce` call-order semantics in existing tests depend on serial fetch | Verified: `mockResolvedValueOnce` pops in call-initiation order, which our design preserves. Validate empirically by running the full suite before PR |
| Fail-fast error semantics diverge from today | Equivalent user-visible behavior for single-error cases; documented in jsdoc |
| Error captured is the LAST not FIRST | Fixed in the sketch above (`if (fatalError === undefined) fatalError = { error }`) |
| 100% coverage drops on the new primitive | Test plan enumerates every branch; primitive is pure and testable in isolation |
| S3 or downstream throttling under increased concurrency | 10 per-prefix is well within S3 limits; the prod case already issued 118 sequential requests — we're trading latency for briefly higher QPS in the same Lambda |
| Lambda memory regression | Peak memory per level: ~11 `BoldDocument` references (≪ 1 MB typical). Negligible on a 512 MB+ Lambda |
| Nested recursion amplifies in-flight count beyond 10 | All current callers have effective depth 1; documented as a known limitation |
| Actor order change visible in snapshot tests | Update snapshots as part of the rewards-distribution test changes; canonical sort makes future changes safe |
| Smaug enum strings drift from methodology-rules enum | Test 18 pins the equivalence — fails loudly on divergence |
| Temporary debug logs get left behind | Explicit revert is in scope (Files Touched table + Goal 6) |
| Transient refs during error unwind misread as a leak | Explicitly documented in "Memory during error unwind" section |

## Rollout / verification

1. **Branch:** `perf/document-query-bounded-parallelism` (already created and currently holds this spec).
2. Implement the primitive and its tests first. Get it to 100% coverage in isolation before touching anything else.
3. Refactor `abstract-document-query.service.ts` and `document-query.service.ts`. Run existing `document-query.service.spec.ts` — expect all green without modification.
4. Add new parallel-semantics tests (14-15).
5. Implement rewards-distribution sort fix and its tests (16-19).
6. Revert the debug logs in `rewards-distribution.processor.ts`.
7. Run full `nx lint` + `nx ts` + `nx test` on affected projects. Any coverage drop or test failure blocks progress.
8. Re-run the production repro:
   ```
   aws-vault exec smaug-prod -- pnpm run-rule \
     libs/methodologies/bold/rule-processors/credit-order/rewards-distribution \
     --methodology-execution-id 104a09fc-b58d-4e2c-893e-7bd27495e81a \
     --audit-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
     --audited-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
     --config '{"match":{"category":"Methodology","type":"RecycledID"}}' \
     --debug
   ```
   **Expected:** elapsed time drops from ~82s to ~8–10s. Numeric result content byte-identical to the previous successful run. Actor array in canonical sort order.
9. Open PR. Include before/after timing in the description.

## Known limitations (accepted)

- **Nested recursive criteria** can multiply in-flight counts by stack depth (max `d × concurrency`). Not a concern for any existing caller. Fix (if ever needed): thread a single shared limiter through recursive `loadQueryCriteria` calls.
- **No fetch cancellation.** In-flight fetches that happen after a fatal error run to completion; their results are dropped. Matches today's semantics. Transient memory during error unwind is bounded by `concurrency × sizeof(Document)` and self-cleans.
- **Smaug canonical sort is duplicated**, not imported. The two repos are independent and cross-repo imports are not a pattern here. A test pins the equivalence; divergence fails loudly. If Smaug ever changes its order without coordinating, we find out via the rewards-distribution assertion tests.
