# 001 — Deepen the One-Critter Daily Loop

**Status:** M1 complete on 2026-09-26. M2–M6 are not started.
Source baseline: `3a346fc` (documentation bootstrap on gameplay `06aa91e`),
identical in content to the published bootstrap `7e14cac`.
This session executes M1 only and stops at its stable boundary.

## Outcome and scope

Make care, training, useful work, recovery, farming, and the existing small contest
support several enjoyable days with one individual critter. Minimal preparation
must stop the original novice Pip and berry-only assumptions from spreading.

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

**Status:** complete (2026-09-26). All acceptance criteria below verified; see evidence and environment limitations.

Prepare the minimum representation of persistent individuals, ownership, and a
selected working companion needed to evolve the one-critter loop. Keep one
playable companion and the existing activities; do not build a roster screen or
the prologue. Choose simple data structures within the current host boundary.

Acceptance criteria:

- [x] Record a short baseline browser walkthrough of care, training, gathering,
      farming, racing, sleep, and reload. Note concrete friction rather than
      asserting the existing loop is fun because its end-to-end test passes.
- [x] Individual identity, owner, and selection are distinguishable. A fixture
      can represent a future Grandpa-owned Pip separately from a player-owned
      starter; commands/rewards cannot accidentally update the other individual.
      This fixture does not require spawning Grandpa or implementing NPC AI.
- [x] Fresh games use a clearly provisional player starter distinct from narrative
      Pip. UI/interaction text for that companion derives from its identity rather
      than assuming every critter is Pip. Retain existing original geometry unless
      a small identity change is necessary; new species art is outside this slice.
- [x] A populated version-1 save migrates explicitly, retaining the legacy critter's
      ID/name, age, stats, care, berry progress, skills, traits, history/results,
      world/economy/crop/upgrade progress, and random seed. Do not silently turn the
      old novice Pip into Grandpa's expert. Record the schema decision and the
      treatment of any in-progress training activity.
- [x] Migration/reload is stable on repeated loads; malformed and future-version
      saves remain intact, with saving blocked as appropriate. The single-writer
      behavior is preserved where supported.
- [x] Existing care → practice → gather/learn → garden → trial → sleep remains
      playable through normal input, persists after reload, and works at narrow
      and desktop sizes with the established input routes.
- [x] Relevant unit/persistence/browser checks, lint, build, and formatting pass
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

## M1 evidence — 2026-09-26

### Baseline walkthrough

Ran the unchanged gameplay at `3a346fc` (gameplay `06aa91e`) with Playwright's
normal-input complete-day scenario at 1280×800. It petted/fed Pip, practiced three
cues, planted/watered feed, walked to Clover Glade, demonstrated three harvests,
issued two gathering cues, observed autonomous foraging, sold berries, improved
the shed, harvested feed, ran the Clover Cup, slept, reloaded, and inspected the
journal. One scenario passed in 1.6 minutes. The test reads Angular development
state to observe position/timing, never to grant progress; this is an automated
walkthrough with screenshot inspection, not a fresh human pacing/fun assessment.

Observed friction and feedback:

- The interaction card covers nearby characters/world space in the glade. The
  independent-forager label, seven learning marks, and journal note clearly show
  learning; depleted bushes give an explicit wait/recovery explanation.
- Day two retains a completed four-item starter checklist. It provides little
  direction about what to pursue next, despite renewed energy and a new trial.
  The screenshot shows day 2 at 08:00, age 19, energy 100, bond 32, shed improvement,
  six feed, and persisted independent foraging. M5 should investigate tomorrow's
  purpose; M1 does not invent a goal system.
- Learning can reach autonomy during this first scripted day. This establishes
  continuity, not a desirable pace. Travel used precise keyboard guidance, so this
  run does not measure how a new player discovers routes or manages fatigue.

Baseline trace and screenshots were captured as `m1-baseline` in the working
session; the observations above are the durable record. No new art or balance
changes were made from these observations.

### Implementation and verification

- Schema v2, provisional Mallow, explicit ownership and selection, per-individual
  petting, participant-bound activities, and identity-derived UI/world text are
  implemented. See [D16](../../DECISIONS.md#d16--minimal-identity-model-and-save-v2-implemented-2026-09-26).
- The frozen populated v1 fixture includes an unfinished paid activity, needs,
  stats, traits/genetics/pedigree, berry knowledge/skills, history/results, crop,
  upgrades, inventory, respawning resources, economy, and seed. Migration preserves
  all fields; golden training/race continuations match the old host. Unit fixtures
  put Grandpa-owned Pip first in the array to detect accidental selection by order.
- 35 host/storage tests passed. Browser suite: 36 passed, 8 intentional viewport
  skips, zero failures (5.1 minutes). Full normal-input day and reload pass at
  390×844 and 1280×800; save migration, protection/reset, and single-writer checks
  pass at those sizes plus 844×390 and 768×1024. Mocked controller navigation passes.
- Inspected actual day-two narrow/desktop screenshots: Mallow's card, learning,
  prompts, journal, and world label retain the individual name and fit their layout.
  Narrow play remains vertically scrollable; the interaction card still obscures
  much of the diorama. That existing friction is recorded, not claimed resolved.
- Production build, lint, formatting, and whitespace checks pass. Offline production
  reload renders the world and retains care. The PWA script now asserts the care
  action and waits for its IndexedDB write before reloading; its former immediate
  reload raced pending work in this environment. No save data was repaired or
  injected to make that check pass. Pages subpath/release configuration is unchanged.
- The baseline/current renderer logs the existing `PCFSoftShadowMap` fallback
  warning. No runtime page errors occurred in the full-day scenarios.
- Browser environment: the locked Playwright Chromium 153 download was unavailable
  (empty/forbidden archive). Used an official Chromium headless-shell 134 build and
  SwiftShader. Native gamepad discovery crashes in this container, including on
  baseline. Temporary test copies suppress native gamepad discovery/events for all
  tabs; the controller scenario supplies its own standard-map pad. Application
  code and CI browser configuration are unchanged. Physical controller testing
  remains pending; this does not verify hardware connection events.
- Initial regression run found reset assertions still expecting v1 (updated to
  v2), and a short fixed controller button hold could be missed by slow rendering,
  also reproduced on baseline. The fixture now holds press/release across frames.
  The isolated browser adaptation was also extended to secondary tabs.

Commands used (Node 24.19.0; local run on 2026-09-26):

| Check           | Command / outcome                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline        | In the detached bootstrap worktree: `npx playwright test --config=tmp/playwright.local.config.ts --project=desktop -g 'plays a complete day' --trace on`; 1 passed.                                  |
| Unit            | `npm test -- --watch=false`; 35 passed.                                                                                                                                                              |
| Lint/build      | `npm run lint`; passed. `npm run build:pages`; passed, SPA fallback/manifest/service worker found, 902.13 kB initial raw bundle.                                                                     |
| Browser         | `npx playwright test --config=tmp/playwright.local.config.ts --workers=1 --trace on`; 36 passed, 8 intentional skips. Temporary config/copies apply only the environment adaptation described above. |
| Offline         | `node tmp/check-pwa.local.mjs`; same production check with the browser-launch/native-gamepad adaptation, passed at base `/`.                                                                         |
| Formatting/docs | `npm run format:check`, `git diff --check`, local Markdown link and retired-name audit; passed.                                                                                                      |

The standard Chromium 153 commands must still run in normal CI once published;
these adapted local results do not claim an unmodified browser run or deployment.
No physical-pad or fresh-human fun assessment was performed.

### Commit and publication record

The published bootstrap `7e14cac` has the same tree as the earlier local `3a346fc`.
Rebased only the new work onto it, retaining an unchanged final tree. Stable commits:

- `6f65e7c` — campaign language and individual-value principle.
- `9cf27dc` — complete M1 implementation, migration, verification, and canonical docs.
- This delivery-note commit records the publishing blocker and continuation point.

`git push origin HEAD:main` failed because this environment has no Git HTTPS
credentials. The connected GitHub write path also returned **403: Resource not
accessible by integration** when creating the reviewed tree. No remote ref was
changed. `git ls-remote origin refs/heads/main` still reports
`7e14cacba8d6a0f0bfd1afc1a11b3880bc17fbbe`. Local verification is not a deployment.

Fallback deliverable: `critterstead-m1.patch`, exported with `git format-patch`
from `7e14cac..HEAD`, including language, M1, and this handoff. Apply with
`git am critterstead-m1.patch` on a branch based on the published bootstrap, then
push through an authorized checkout. It does not repeat the bootstrap commit.

## Current handoff

- **Completed:** campaign/M1 wording cleanup and canonical individual-value
  principle; M1 identity/ownership/selection, fresh Mallow, v1 migration, loop
  preservation, and acceptance verification. Stable commits are recorded above.
  Publication is blocked; preserve the local commits and apply the exported patch
  through an authorized checkout. Bootstrap must not be applied a second time.
- **Known limits:** hardcoded berry learning and one rendered/simulated companion;
  other stored individuals dormant; narrow interaction-card occlusion; repeated-day
  motivation and physical controller unproven. Standard Chromium CI/deployment
  verification awaits publication. No new mechanics or story systems.
- **Exact next gameplay action:** when continuing this campaign, start **M2 —
  Generalize learning while retaining the berry experience**. Inspect current
  status/commits and reconcile publication first, then trace `berryKnowledge` and
  its stage thresholds into a small authored behavior plus per-individual progress,
  with v2 save migration and the current berry arc preserved. M2 has not begun in
  this session; stop here.
