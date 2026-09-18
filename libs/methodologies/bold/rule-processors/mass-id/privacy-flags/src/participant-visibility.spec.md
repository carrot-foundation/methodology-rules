# Participant visibility — shared resolution spec

Canonical source: `[lore:canonical/adr/participant-role-public-visibility]`.
Published per-role policy: `[docs:en/integrations/guides/privacy-and-masking]`.
Supply-chain vocabulary: `[docs:en/protocol/supply-chain]`.

This file and `participant-visibility.vectors.json` beside it are **vendored byte-identical
into every repo that decides participant visibility**. A change lands in all copies in the
same change, or the copies disagree and one surface starts publishing a participant another
withholds.

Copies live in: `palantir`, `smaug`, `methodology-rules`, `rivendell`.

## The rule

One participant resolves to **one** visibility for the whole document. Roles and
`preserveSensitiveData` flags are collected across **every** occurrence of that participant id
in the document, then resolved in this order. The first step that matches decides.

1. `preserveSensitiveData: true` on **any** occurrence → **private**. Most-private-wins.
2. The participant holds **Waste Generator** → **private**. Step 3 never applies to it.
3. The participant holds **Hauler** together with **Recycler** or **Processor** → **public**.
   The entity is already disclosed by its public role, so masking its hauling appearance
   protects nothing. This is the only exception of its kind.
4. `preserveSensitiveData: false` on any occurrence → **public**.
5. Role default:
   - **public** — Processor, Recycler, Network Integrator, Waste Manager
   - **private** — Waste Generator, Hauler, Bin Custodian
   - Roles disagreeing at this step resolve **private** (most-private-wins).
   - No known role → participant type: `COMPANY` → public, anything else → private.

### Two consequences worth stating, because implementations get them wrong

**An absent `preserveSensitiveData` is not a private default.** It falls through to step 5, so
an omitted flag on a Recycler resolves **public**. An implementation that treats absence as
"withhold" and one that treats it as "publish" both pass a test suite that never omits the
field.

**Waste Generator and Hauler are not symmetric.** A Hauler with an explicit `false` is public
(step 4). A Waste Generator with an explicit `false` is still **private** — step 2 is terminal
and decides before step 4 is reached.

## Roles

Seven, spelled as the published supply-chain vocabulary spells them — `Hauler` and
`Network Integrator`, never `Collector` or `Integrator`:

`Waste Generator`, `Waste Manager`, `Bin Custodian`, `Hauler`, `Processor`, `Recycler`,
`Network Integrator`.

**Bin Custodian is an unvalidated working assumption.** It was defined to unblock the Atlas
data contract and has not been validated with the team. Implement it as specified, but do not
cite it as established policy and do not publish it as public documentation.

## What a conforming repo does

Run every vector in `participant-visibility.vectors.json` through **your own resolver** —
not a copy of the reference logic — and assert the resolved visibility equals `expected`.
The vectors are the contract; the resolver is yours.

A vector whose roles your repo cannot represent (a role absent from your enum, an occurrence
shape you do not model) is **skipped explicitly and reported**, never silently dropped. A
suite that quietly skips what it cannot express passes while proving nothing.
