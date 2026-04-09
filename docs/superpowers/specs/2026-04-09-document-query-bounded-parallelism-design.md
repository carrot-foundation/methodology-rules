# Design: Bounded-parallel document fetch in `DocumentQueryService`

**Date:** 2026-04-09
**Status:** Approved — ready for implementation planning
**Target file(s):**
- `libs/shared/methodologies/bold/io-helpers/src/abstract-document-query.service.ts`
- `libs/shared/methodologies/bold/io-helpers/src/document-query.service.ts`
- `libs/shared/methodologies/bold/io-helpers/src/document-query.service.spec.ts`
- `libs/methodologies/bold/rule-processors/credit-order/rewards-distribution/src/rewards-distribution.helpers.ts`

## Context

`DocumentQueryService.loadQueryCriteria` in `abstract-document-query.service.ts:87-117` walks related documents serially: every S3 fetch awaits the previous one's completion. For rules that fan out to many related documents, this dominates wall-clock time.

**Measured impact (production credit-order rewards-distribution, execution `104a09fc-b58d-4e2c-893e-7bd27495e81a`):**

- 118 `RecycledID` certificates, each fetch ~700ms, CPU work ~1ms
- Total elapsed: ~82s
- Lambda prod timeout is 30s → rule currently times out in production

## Goals

1. Make `loadQueryCriteria` fetch related documents in parallel with a fixed upper bound of **10 concurrent S3 requests**.
2. Preserve exact output semantics for **every** existing rule — result arrays and callback invocation order must be byte-identical to serial today.
3. Enforce a strict memory cap: **at most 10 `BoldDocument` references held simultaneously per `loadQueryCriteria` call**. No unbounded buffering. No leaks.
4. Independently, make `credit-order/rewards-distribution`'s output actor array deterministic via a canonical sort (port Smaug's order).

## Non-goals

- Adding external dependencies (`p-map`, `p-limit`, etc.) — we hand-roll the limiter.
- Making concurrency user-configurable per-call. Hardcoded `10` with a named constant.
- Cross-level concurrency cap for nested recursive criteria. All current callers have effective depth 1; documented as a known limitation with a path forward if needed.
- Changing the public `iterator().map|each` API. Callers are unchanged.

## Order-dependence audit (input to the design)

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

Two-phase pipeline inside `loadQueryCriteria`:

**Phase 1 — parallel fetch (bounded):**
A worker pool with at most `CONCURRENCY` active fetches. Workers pull task indices in order and store fetched documents into a `Map<taskIndex, Document>` buffer keyed by input position.

**Phase 2 — serial walk (in-order):**
The walker iterates task indices `0..n-1`. For each index `i`:
1. If buffered, consume it.
2. Otherwise, `await` a per-index notifier until the fetch lands.
3. Delete `fetched[i]` immediately (release reference).
4. Invoke the callback with the fetched doc.
5. Recurse into `loadQueryCriteria` for the nested criterion.

Fetch and walk overlap: workers are always filling the pipeline while the walker drains it.

## Memory invariant (the strict cap)

**Invariant:** `inFlight.size + fetched.size ≤ CONCURRENCY` at all times.

- Workers only fire new fetches when `dispatch` sees `inFlight + fetched < CONCURRENCY`.
- When a fetch completes, it moves from `inFlight` → `fetched` (size preserved).
- When the walker consumes `fetched[i]`, it **immediately deletes the entry**, then calls `dispatch` to refill. `fetched.size` drops → a new slot opens → worker fires the next task.

**Worst-case trace (slot 0 is slow):**
```
t0:  inFlight={0..9}, fetched={}        total=10 ✓ no new dispatch
t1:  slots 1..9 complete before slot 0
     inFlight={0},   fetched={1..9}     total=10 ✓ no new dispatch
t2:  slot 0 finally completes
     inFlight={},    fetched={0..9}     total=10 ✓ no new dispatch
t3:  walker awakens, consumes doc 0, deletes fetched[0]
     inFlight={},    fetched={1..9}     total=9 → dispatch fires slot 10
     inFlight={10},  fetched={1..9}     total=10 ✓
t4:  walker consumes doc 1, deletes fetched[1]
     inFlight={10},  fetched={2..9}     total=9 → dispatch fires slot 11
     ...steady state at 10 ...
```

**No unbounded buffering.** No `fetchPromises` array is held across iterations (the common leak in naïve implementations: a pre-allocated array of resolved promises retains all resolved values until the array itself is GC'd). The walker's `fetched.delete(i)` after each consumption is the release point.

**Across call-stack depth:** each recursive `loadQueryCriteria` call has its own pool. With current callers (effective depth 1), total doc references ≤ `CONCURRENCY + 1` (the `+1` is the parent's current doc being walked). For hypothetical depth `d`, total ≤ `d × (CONCURRENCY + 1)`. Not a concern today — documented as a known limitation.

## Interface changes

### `BaseDocumentQueryService` (abstract)

- Add abstract method `fetchDocument(documentKey: DocumentKey): Promise<Document>`.
- Rewrite `loadQueryCriteria` as the bounded-parallel two-phase pipeline. Internal only — signature is unchanged (same `{callback, context, criteria, document}` args, same `Promise<T[]>` return).
- Remove the abstract `loadDocument` method (was only called from `loadQueryCriteria`).
- Add a `CONCURRENCY` constant (= 10) alongside the class.

### `DocumentQueryService` (concrete)

- Implement `fetchDocument(documentKey)` by calling `this.documentFetcher.fetch(documentKey)`. This pulls the fetch + validation logic out of the old `loadDocument`.
- Remove the concrete `loadDocument` override. The base class now orchestrates via `fetchDocument` + inline callback invocation and recursion.
- The logic that was in old `loadDocument` (callback invocation when criterion isn't a related-document criterion, recursive `loadQueryCriteria` for nested criteria) moves into the base class's walker phase.

### Public API

- `iterator().map|each` signatures and semantics **unchanged**.
- All 8 production callsites untouched.

## Hand-rolled semaphore (sketch — final code in implementation)

```ts
const CONCURRENCY = 10;

// Inside loadQueryCriteria — simplified
const tasks = flattenConnectionsToTasks(connections);
const fetched = new Map<number, Document>();
const notifiers = new Map<number, () => void>();
let nextDispatch = 0;
let inFlightCount = 0;
let fatalError: unknown;

const dispatch = () => {
  while (
    fatalError === undefined &&
    inFlightCount + fetched.size < CONCURRENCY &&
    nextDispatch < tasks.length
  ) {
    const i = nextDispatch++;
    inFlightCount++;
    this.fetchDocument(tasks[i].documentKey)
      .then((doc) => {
        inFlightCount--;
        fetched.set(i, doc);
        notifiers.get(i)?.();
        notifiers.delete(i);
      })
      .catch((err) => {
        inFlightCount--;
        fatalError = err;
        // Wake any waiter so the walker can surface the error.
        for (const notify of notifiers.values()) notify();
        notifiers.clear();
      });
  }
};

dispatch();

const results: T[] = [];
for (let i = 0; i < tasks.length; i++) {
  if (!fetched.has(i)) {
    await new Promise<void>((resolve) => notifiers.set(i, resolve));
  }
  if (fatalError !== undefined) throw fatalError;

  const doc = fetched.get(i)!;
  fetched.delete(i);      // release reference
  dispatch();              // refill pipeline

  const task = tasks[i];
  if (!isRelatedDocumentCriteria(task.criterion)) {
    results.push(callback({ document: doc }));
  }
  const nested = await this.loadQueryCriteria({
    callback,
    context,
    criteria: task.criterion,
    document: doc,
  });
  results.push(...nested);
}

return results;
```

Notes:
- `fatalError` captures the first failure. The walker surfaces it on its next iteration. Other in-flight fetches run to completion naturally (no cancellation API on the underlying SDK), but their results are discarded because `dispatch` guards on `fatalError === undefined`.
- `notifiers.get(i)` wake-up fires only when slot `i` specifically lands. On fatal error we flush all waiters so the walker can surface the error instead of hanging.
- `dispatch` is called after every walker consumption and inside `.then`, ensuring the pipeline is always filled up to the cap.

## Actors array determinism (rewards-distribution)

**Problem:** `aggregateMassIDCertificatesRewards` in `rewards-distribution.helpers.ts:132-194` returns `[...actors.values()]` — Map insertion order — which currently happens to be deterministic because fetches are serial. With concurrency this order becomes stable by the design above, but we should still pin the output order independently of fetch order.

**Fix:** Port Smaug's canonical actor sort order from `smaug/libs/shared/palantir/helpers/src/helpers.ts:64-74`:

```ts
// In rewards-distribution.helpers.ts (or a co-located helper)
const ACTOR_TYPE_SORT_ORDER: ReadonlyMap<string, number> = new Map([
  ['Waste Generator', 1],
  ['Hauler', 2],
  ['Processor', 3],
  ['Recycler', 4],
  ['Community Impact Pool', 5],
  ['Integrator', 6],
  ['Methodology Author', 7],
  ['Methodology Developer', 8],
  ['Network', 9],
]);
```

Apply a stable sort at the end of `aggregateMassIDCertificatesRewards` before returning. For two actors of the same `actorType` (e.g. two waste generators), fall back to `participant.id` for stability.

Add a code comment pointing to the Smaug source of truth so future divergence is noticed. Use the enum `RewardsDistributionActorType` values where possible rather than string literals.

## Tests

### Shared service (`document-query.service.spec.ts`)

1. **Order preservation test:** load a query with 25 fake related documents, each with a randomized fetch delay (`setTimeout`-based stub). Assert:
   - `.map()` return array is in input order.
   - `.each()` callback invocation order matches input order (record via a side-effect log).
2. **Concurrency cap test:** hook the stubbed fetcher with an "active count" probe. Assert the probe's peak value is exactly `CONCURRENCY` (10) when `tasks.length > CONCURRENCY`, and `≤ tasks.length` otherwise.
3. **Memory cap test:** same stubbed fetcher, assert `inFlight + fetched ≤ CONCURRENCY` at every observation point. The stub records the count of outstanding fetches it's serving (in-flight) via a closure-captured counter, and exposes a probe hook that the walker calls after each `fetched.delete` — this keeps the assertion purely inside the test without adding any production debug hooks.
4. **Error propagation test:** one of N fetches rejects; the `.map()` promise rejects with that error; other in-flight fetches still resolve without being awaited.
5. **Unit test for the limiter logic itself** (extract into a pure helper if it aids testability).

### Rewards-distribution processor

6. Update existing unit tests to assert the new deterministic actor array order.
7. Add a test that re-runs `aggregateMassIDCertificatesRewards` with a shuffled input array and asserts the output is byte-identical (amounts, percentages, ordering).

### Full suite

8. Run the entire test suite. Any silent fetch-completion-order dependency we missed surfaces here. (Expected: none, by the order-preservation design.)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| A rule's `.each()` callback has a subtle side-effect order dependency not caught in the audit | The order-preservation invariant (callback invoked in input order) makes this structurally impossible |
| Refactoring `loadDocument` splits break the single internal caller | The base-class walker is the only consumer; careful refactor + existing spec file has strong coverage |
| Fail-fast error semantics diverge from today (today: fails at first rejected `await`; new: fails at walker's next iteration) | Equivalent user-visible behavior for single-error cases; documented in jsdoc |
| S3 or downstream throttling under increased concurrency | 10 per-prefix is well within S3 limits; the prod case already issued 118 sequential requests — we're trading latency for briefly higher QPS in the same Lambda |
| Lambda memory regression | Peak memory per level: ~10 `BoldDocument` references (≪ 1 MB typical). Negligible on a 512 MB+ Lambda |
| Nested recursion amplifies in-flight count beyond 10 | All current callers have effective depth 1; documented as a known limitation with a clear path forward (single shared limiter threaded through recursive calls) |
| Actor order change visible in snapshot tests | Update snapshots as part of the rewards-distribution test changes; canonical sort makes future changes safe |

## Rollout / verification

1. Implement shared-service changes and their tests.
2. Implement rewards-distribution sort fix and update its tests.
3. Run full `nx test` + `nx lint` + `nx ts` across affected projects.
4. Re-run the production repro:
   ```
   aws-vault exec smaug-prod -- pnpm run-rule \
     libs/methodologies/bold/rule-processors/credit-order/rewards-distribution \
     --methodology-execution-id 104a09fc-b58d-4e2c-893e-7bd27495e81a \
     --audit-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
     --audited-document-id b57c40f4-a719-422b-be84-d49aa5d5961e \
     --config '{"match":{"category":"Methodology","type":"RecycledID"}}' \
     --debug
   ```
   **Expected:** elapsed time drops from ~82s to ~8–10s. Result content byte-identical to the previous successful run.
5. Remove the temporary debug logs added during the earlier investigation in `rewards-distribution.processor.ts`. They served their purpose identifying the bottleneck; the permanent observability story belongs in the shared service (not in scope here).

## Known limitations (accepted)

- Nested recursive criteria can multiply in-flight counts by stack depth. Not a concern for any existing caller. Fix (if needed later): thread a single shared limiter through recursive `loadQueryCriteria` calls.
- No fetch cancellation. In-flight fetches that happen after a fatal error run to completion; their results are dropped. Matches today's semantics.
