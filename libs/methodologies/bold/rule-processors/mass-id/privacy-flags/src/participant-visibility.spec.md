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
   One kind of flag is set aside: each `true` on a **Hauler-only** occurrence — one whose roles,
   counting only the seven below, are exactly Hauler — when the participant also holds a
   **publicly disclosed** **Recycler** or **Processor** role. A role is publicly disclosed only
   on an occurrence whose ACTOR event is `isPublic: true`, and only when it is read from that
   event's `label` or from an `actor-type` attribute that is itself `isPublic: true`. That flag
   masks the hauling appearance of an entity its public role already discloses, which is the
   case step 3 exists for. A Recycler or Processor role held only on events that are not
   `isPublic: true`, or read only from a private `actor-type` attribute, discloses nothing on a
   public surface, so it sets no flag aside.
2. The participant holds **Waste Generator** → **private**. Step 3 never applies to it.
3. The participant holds **Hauler** together with **Recycler** or **Processor** → **public**.
   The entity is already disclosed by its public role, so masking its hauling appearance
   protects nothing. This is the only exception of its kind.
4. `preserveSensitiveData: false` on any occurrence → **public**.
5. Role default:
   - **public** — Processor, Recycler, Network Integrator
   - **private** — Waste Generator, Hauler, Bin Custodian, Waste Manager
   - Roles disagreeing at this step resolve **private** (most-private-wins).
   - No known role → participant type: `COMPANY` → public, anything else → private.
     **Type aggregates most-private-wins too:** if any occurrence of that participant
     carries a non-`COMPANY` type, the fallback resolves private. Event participant
     snapshots are historical, so an actor that converted from individual to company
     carries both types across its own events — taking the last one seen publishes on
     the newest snapshot alone. The vectors cover this: an occurrence may carry its own
     `participantType`, which overrides the vector's for that occurrence, and two
     vectors place the non-`COMPANY` occurrence on each side of the `COMPANY` one.

### Three consequences worth stating, because implementations get them wrong

**An absent `preserveSensitiveData` is not a private default.** It falls through to step 5, so
an omitted flag on a Recycler resolves **public**. An implementation that treats absence as
"withhold" and one that treats it as "publish" both pass a test suite that never omits the
field.

**Waste Generator and Hauler are not symmetric.** A Hauler with an explicit `false` is public
(step 4). A Waste Generator with an explicit `false` is still **private** — step 2 is terminal
and decides before step 4 is reached.

**A producer's Hauler flag does not withhold a recycler that also collects.** Producers mark
Hauler events `preserveSensitiveData: true` because the published policy masks hauler data, and
a recycler or processor that runs its own collection is recorded under Hauler as well. Without
the set-aside, step 1 decides every such participant private and step 3 never runs on the shape
it was written for. The set-aside is narrow: a `true` on an occurrence that also holds
another known role, a `true` on the Recycler or Processor occurrence, a Recycler or Processor
role that is not publicly disclosed (held only on events that are not public, or read only
from a private `actor-type` attribute), or a Waste Generator role anywhere still withholds the
participant.

## Roles

Seven, spelled as the published supply-chain vocabulary spells them — `Hauler` and
`Network Integrator`, never `Collector` or `Integrator`:

`Waste Generator`, `Waste Manager`, `Bin Custodian`, `Hauler`, `Processor`, `Recycler`,
`Network Integrator`.

BOLD's ACTOR `label` spells `Network Integrator` as `Integrator` on the wire. The role keeps
its published name here, and a resolver maps the wire spelling to it.

**Waste Manager is private to stop generator re-identification, not because its own
participation is sensitive.** A waste manager is contracted by one generator to choose the
destination, so wherever it serves a single generator in a municipality, naming it names the
generator beside it — and municipality and state are themselves public
`[lore:canonical/adr/public-location-granularity]`. The generator masking is only as strong as
the least-masked party standing next to it. Do not "correct" this back to public because the
role's own contribution is a public-interest decision; that is the argument the ADR originally
made, and it is about a different question than re-identification.

**Bin Custodian is an unvalidated working assumption.** It was defined to unblock the Atlas
data contract and has not been validated with the team. Implement it as specified, but do not
cite it as established policy and do not publish it as public documentation.

## Where the role comes from

A role is read only from ACTOR events: from the `label`, and on **legacy MassIDs**, which carry
no `label`, from the metadata attribute `actor-type`, spelled in the legacy vocabulary. Read
both. A BOLD `label` of `Integrator` names Network Integrator, the same mapping the legacy
table below applies to `INTEGRATOR`. Map the attribute:

| `actor-type` | Role |
| --- | --- |
| `SOURCE` | Waste Generator |
| `HAULER` | Hauler |
| `PROCESSOR` | Processor |
| `RECYCLER` | Recycler |
| `INTEGRATOR` | Network Integrator |

Any other value names no known role. When an event carries both a `label` and an `actor-type`,
the occurrence holds both roles.

**Read the attribute whatever its own `isPublic` says.** That flag governs whether the attribute
may be published, not whether the role it names may withhold the participant. A resolver that
reads only `label`, or only public attributes, sees no role on a legacy generator: with
`preserveSensitiveData: false` step 4 publishes it, and with the flag absent step 5 publishes it
whenever it is a `COMPANY`.

The one place the attribute's `isPublic` matters is disclosure. Reading a role to **withhold**
ignores it; counting a role as **publicly disclosed** for step 1's set-aside requires it. A
private attribute is never shown, so a Recycler role that lives only there discloses nothing.

In the vectors, an occurrence with no `role` has no `label`, and `legacyActorType` carries the
attribute's `value` and its own `isPublic`. An occurrence's optional `participantType`
overrides the vector's `participantType` for that occurrence alone; a harness reads
`occurrence.participantType ?? vector.participantType`.

An occurrence's optional `eventIsPublic` is its ACTOR event's own `isPublic`. Absent means the
source event omits it, which is not `true`: only `eventIsPublic: true` lets a Recycler or
Processor occurrence set a Hauler-only flag aside, and then only for a role read from its
`role` or from a `legacyActorType` whose own `isPublic` is `true`. No other step reads it.

## What a conforming repo does

Run every vector in `participant-visibility.vectors.json` through **your own resolver** —
not a copy of the reference logic — and assert the resolved visibility equals `expected`.
The vectors are the contract; the resolver is yours.

A vector whose roles your repo cannot represent (a role absent from your enum, an occurrence
shape you do not model) is **skipped explicitly and reported**, never silently dropped. A
suite that quietly skips what it cannot express passes while proving nothing.
