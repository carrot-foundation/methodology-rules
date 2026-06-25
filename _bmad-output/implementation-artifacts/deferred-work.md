# Deferred work — surfaced during review (not caused by the Others-organic story)

_From bmad-quick-dev step-04 adversarial review, 2026-06-24._

- **e2e specs excluded from the default test target (pre-existing infra).** `*.lambda.e2e.spec.ts` is globally excluded from the only `test` target; the 2 new prevented-emissions e2e terminal-state tests pass only when forced (22/22) and do **not** run via `pnpm nx test prevented-emissions` or in CI. The spec/plan assumed "mandatory e2e" runs as part of test. Decide: add a dedicated e2e target/config that clears the exclude, or accept e2e as manual-only and adjust the convention. (Acceptance auditor)

- **`pickUpDate` fallback semantics.** When a MassID has no `PICK_UP` event, the rule falls back to `massIDDocument.externalCreatedAt` as the pickup reference for the 2-year validity check (a spec-sanctioned assumption). A future/odd document date could mask a stale laudo. Revisit whether an absent `PICK_UP` should yield `NOT_APPLICABLE`/terminal for `OTHERS_IF_ORGANIC` instead. (Blind hunter) — _Note (CodeRabbit round, 2026-06-25): the fallback value is not observable through the integration fixture — without a `PICK_UP` event the classification is absent and the resolver throws first; with a `PICK_UP` event the stub builder always assigns a timestamp. The fallback is therefore defensive code; the test asserts graceful FAILED on an absent pick-up instead._

- **`wasteSubtype as StaticFactorSubtype` cast — RESOLVED (CodeRabbit, 2026-06-25).** `getStaticPreventedEmissionsFactor` now guards the lookup and throws the known `INVALID_MASS_ID_DOCUMENT_SUBTYPE` error instead of returning `undefined`/`NaN` if the subtype/baseline pair is missing. The cast remains at the callsite but is no longer a latent `NaN` source.

## Retroactive-credit window vs. pending hold (raised by Laura, 2026-06-24)

- **Concern.** Credits only for masses recycled up to the **previous calendar year** ("massa de 2025, laudo só em 2027 → não dá mais"). Distinct axis from our 2-year laudo validity (`pickUpDate ≤ analysisDate + 2y` = laudo freshness vs. credit-issuance eligibility).
- **Where enforced.** Separate rule `project-period-limit`, NOT prevented-emissions: passes iff RECYCLED event date `>= UTCDate(currentYear - 1, Jan, 1)`, computed from the **audit-run clock** (`new Date()`), not a fixed mass date. So a 2025-recycled mass passes when audited 2025/2026, FAILS from 2027.
- **Interaction risk.** Holding a mass as `REVIEW_REQUIRED` until a late laudo can cross a year boundary; on re-audit `project-period-limit` recomputes its window and the mass falls out even though carbon-fraction finally resolves.
- **Open question (Smaug-side, deciding factor).** Does a re-audit re-run ALL rules (window recomputes → late laudo loses eligibility) or only the previously-pending rule (window keeps original PASS)? Owned by Smaug re-audit orchestration, not confirmable from methodology-rules.
- **Action.** No prevented-emissions code change. Operational deadline: laudo must arrive AND audit complete within the same window (by end of Y+1 for a mass recycled in year Y). Confirm Smaug re-audit behavior with its owner.

## Reconciliation vs. Ops Notion doc (Lau/Caio, "Mapeamento IBAMA x CDM e Tratamento de Others via Laudo")

Source: https://app.notion.com/p/3059703d8e9c8052bb80dfc9a9cc2384

- **[DONE 2026-06-25] Moisture (% umidade) now modeled on the event.** Decision (Antonio): store it. Added `MOISTURE_FRACTION` attribute; **required** for a valid generator characterization (incomplete laudo → stays pending, never wrong-credits), validated via `PercentageStringSchema`, newest-event-wins, surfaced in `othersIfOrganicAudit.moistureFraction` (generator source only). 123 tests / 100% coverage / ts+lint clean.
- **[DECIDED] 2-year validity is final** (Antonio confirmed). Hardcoded +2y stays. (If it ever becomes "indefinida"/per-laudo, the computed `analysisDate + 2y` can't represent it — would need explicit `valid_to`.)
- **MO→C conversion `%C = %MO / 1.72` is Ops-manual** (doc §3.3); rule reads final C% directly — confirmed NO in-rule conversion.
- **[DECIDED] Author %C values confirmed** (Antonio: "pode usar, já está definido"). Source = "Local Waste List" sheet (Caio's IBAMA→CDM table): https://docs.google.com/spreadsheets/d/1g2UpaOtULongvzNQNERC_bXJBGyKMDkZ3ruoLfPQKR8 . The 4 codes are no longer pending sign-off.
- **[DECIDED] Parametrization scope = per generator + waste code** (Antonio: "gerador basta"). No unit/plant granularity.

### Correction — credit-eligibility is decided in methodology-rules, not Smaug
Antonio (2026-06-25): "O Smaug não roda nenhuma regra, quem diz que pode ou não gerar crédito é a regra aqui no methodology-rules." → The retroactive-window open question above is resolved: `project-period-limit` re-runs here with the audit-time clock, so a late laudo crossing a year boundary FAILS that rule automatically (no wrong credit). No Smaug dependency. The remaining concern is purely operational: laudo must arrive AND audit complete by end of Y+1.
