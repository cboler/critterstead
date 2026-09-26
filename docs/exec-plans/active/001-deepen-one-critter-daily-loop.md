# 001 — Deepen the One-Critter Daily Loop

**Status:** M1 in progress, authorized on 2026-09-26. M2–M6 are not started.
Source baseline: `3a346fc` (documentation bootstrap on gameplay `06aa91e`).
This session executes M1 only and stops at its stable boundary.

## Outcome and scope

Make care, training, useful work, recovery, farming, and the existing small contest
support several enjoyable days with one individual critter. Minimal preparation
must stop the current novice Pip and berry-only assumptions from spreading.

Use [GAME-DESIGN.md](../../GAME-DESIGN.md) for gameplay semantics,
[ARCHITECTURE.md](../../ARCHITECTURE.md) for current boundaries and saves, and
[DEVELOPMENT.md](../../DEVELOPMENT.md) for verification. These are linked context,
not documents to copy into this plan on every continuation.

**Non-goals:** full opening/Grandpa NPC/dialogue/town, cousin storyline, multi-critter
management UI, three companions rendered at once, barn capacity progression,
seasons/timeskips/death, breeding/genetics/morphology, combat, full Colosseum,
networking, new platform packaging, and a broad farming/crafting economy.
Do not use this campaign as permission to build a framework for all of them.

Campaign completion requires an intact save-safe game, understandable choices
and observable learning, a repeat-day playtest record, and an explicit product
assessment. Automated gates alone cannot mark “fun proven.” A pending human
playtest is a pending product gate, not a claim of failure or success.

## Milestones

### M1 — Establish distinct critter identity and ownership

**Status:** in progress (2026-09-26). Baseline browser walkthrough and model/migration preparation underway.

Prepare the minimum representation of persistent individuals, ownership, and a
selected working companion needed to evolve the one-critter loop. Keep one
playable companion and the existing activities; do not build a roster screen or
the prologue. Choose simple data structures within the current host boundary.

Acceptance criteria:

- [ ] Record a short baseline browser walkthrough of care, training, gathering,
      farming, racing, sleep, and reload. Note concrete friction rather than
      asserting the existing loop is fun because its end-to-end test passes.
- [ ] Individual identity, owner, and selection are distinguishable. A fixture
      can represent a future Grandpa-owned Pip separately from a player-owned
      starter; commands/rewards cannot accidentally update the other individual.
      This fixture does not require spawning Grandpa or implementing NPC AI.
- [ ] Fresh games use a clearly provisional player starter distinct from narrative
      Pip. UI/interaction text for that companion derives from its identity rather
      than assuming every critter is Pip. Retain existing original geometry unless
      a small identity change is necessary; new species art is outside this slice.
- [ ] A populated version-1 save migrates explicitly, retaining the legacy critter's
      ID/name, age, stats, care, berry progress, skills, traits, history/results,
      world/economy/crop/upgrade progress, and random seed. Do not silently turn the
      old novice Pip into Grandpa's expert. Record the schema decision and the
      treatment of any in-progress training activity.
- [ ] Migration/reload is stable on repeated loads; malformed and future-version
      saves remain intact, with saving blocked as appropriate. The single-writer
      behavior is preserved where supported.
- [ ] Existing care → practice → gather/learn → garden → trial → sleep remains
      playable through normal input, persists after reload, and works at narrow
      and desktop sizes with the established input routes.
- [ ] Relevant unit/persistence/browser checks, lint, build, and formatting pass
      or have concrete pre-existing blockers recorded. Update the implemented
      architecture, decision notes, and this plan; commit the stable milestone.

Suggested stable sub-slices: establish populated legacy fixtures and a validated
migration boundary; integrate the selected individual across host/UI/rendering;
verify the full loop and commit. Keep each integrated slice runnable. If discovery
shows M1 is too large, split it in this file with explicit acceptance criteria
before making an incomplete broad refactor.

### M2 — Generalize learning while retaining the berry experience

**Status:** not started; follows M1.

- [ ] Replace berry-only knowledge assumptions with a small authored behavior
      definition and per-individual learned progress. Do not create a general AI
      planning engine or implement teaching NPCs yet.
- [ ] Observation, eligibility for cues, opportunity recognition, and autonomous
      work retain visible feedback and condition/proximity/resource checks.
- [ ] Existing berry knowledge migrates without relearning or duplicated rewards;
      invalid saves stay protected. Tests demonstrate stage transitions,
      individual isolation, rejected actions, and seeded/save continuity.
- [ ] Browser play shows the existing learning arc and explains why the companion
      does or does not act. No extra job is needed to finish this milestone.

### M3 — Make care, effort, and recovery produce a daily choice

**Status:** not started; balance/mechanics below are experiments to refine using M1 observations.

- [ ] Introduce or tune one understandable recovery option and work/training
      costs so at least two sensible daily routines have different tradeoffs.
      Explain costs and condition effects before commitment and results afterward.
- [ ] A player can recover from an ordinary exhausted/poorly scheduled day through
      normal play without a developer reset, compulsory grind, or critter death.
- [ ] Autonomous work respects condition and communicates its impact; learning
      does not turn the companion into an unexplained stamina drain.
- [ ] Record comparisons of two routines from comparable starting states, including
      what was sacrificed, gained, and carried into tomorrow. Test consequential
      host rules and persistence; browser-check the player-facing explanation.

Do not settle the final day length or add a simulation-wide fatigue system without
evidence. Keep the experiment small; document chosen parameters as provisional.

### M4 — Add one useful learned job

**Status:** not started; choose the job after M2/M3 evidence.

- [ ] One additional activity uses the same learning model and has a distinct useful
      outcome in the current farm/work loop. A garden task is a candidate, not a
      settled requirement. It must change a player's choice, not duplicate berry
      gathering with a new label.
- [ ] Show observation/cue/autonomy progress, condition limits, and a tangible
      reduction or change in the player's chores after learning.
- [ ] The job gives an underused stat or aptitude a concrete role, with clear
      feedback. No broad resource/crafting economy is needed.
- [ ] Normal-input play and focused host/save tests verify useful work, costs,
      no duplicated rewards, and reload preservation alongside berry knowledge.

### M5 — Give tomorrow an understandable purpose

**Status:** not started; use the existing trial and homestead before adding venues.

- [ ] Connect care/training/work to an understandable next-day goal through the
      existing contest and/or a modest visible homestead improvement. The player
      can see why today's decisions influence tomorrow's attempt or resources.
- [ ] Preserve nonlethal competition, fair rewards, and a useful ordinary day after
      a poor result. Avoid infinite reward loops or requiring repetitive sleep
      solely to unlock content.
- [ ] Play several consecutive days without debug shortcuts. Record how routines,
      companion capability, and goals change; verify relevant saved progression.

### M6 — Evaluate and tune the repeated-day experience

**Status:** not started. Product gate before the full prologue.

- [ ] Inspect fresh-start and developed-companion play across at least three days,
      using ordinary inputs and deliberate sleeping rather than developer time
      skips. Include narrow/desktop and controller-route checks; distinguish
      mocked input from any available physical controller evidence.
- [ ] Keep a compact playtest log: player goal, available alternatives, time spent
      in travel/waiting/menus, understood feedback, surprising behavior, and reason
      to continue or stop. Identify and repair the highest-impact in-scope friction.
- [ ] A fresh human playtest assesses whether care feels meaningful, learning is
      rewarding, choices are legible, and another day is appealing. If that has not
      happened, label the product assessment pending and provide a short playable
      test script instead of inventing feedback.
- [ ] Run the affected quality gates and production offline/persistence check.
      Record remaining risks, evidence, and the product decision: iterate on this
      loop or prepare the opening. Do not begin the prologue automatically.

Later milestone details may change based on observations. Record any scope change;
do not quietly replace the campaign's outcome with a larger feature list.

## Current handoff

- **Completed:** documentation bootstrap only; no M1–M6 implementation.
- **Evidence:** source audit and checks in the
  [bootstrap record](../completed/000-repository-memory-bootstrap.md). Earlier
  successful tests describe the prototype, not these new acceptance criteria.
- **Known gaps:** singular novice Pip, no ownership/migration layer, hardcoded berry
  learning and UI, limited recovery/variety, no physical-controller playtest.
- **Decision notes:** retain prototype identities during migration; a fresh-game
  provisional starter is not final acquisition content. M3–M5 mechanics are
  experiments, not newly settled narrative or economic rules.
- **Exact next action:** inspect Git status/recent commits and this plan's baseline,
  run the M1 walkthrough, then implement the minimum identity/ownership/selection
  change with a populated v1 migration fixture. Finish M1 validation, update this
  handoff and architecture, commit, and stop before M2 unless authorized further.

During implementation replace this handoff with current commit IDs, completed
criteria, command/browser evidence, blockers, and the next concrete action. Update
it at stable sub-slices, not only when the session is about to end.
