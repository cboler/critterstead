# 001 — Deepen the One-Critter Daily Loop

**Status:** M1 and M2 complete and published on 2026-09-26 (M1: `122a6ea`, M2: `6b7cf49`).
M3 defined and ready, not started; M4–M6 remain future work.
Source baseline: `3a346fc` (documentation bootstrap on gameplay `06aa91e`),
identical in content to the published bootstrap `7e14cac`.

## Outcome and scope

Make care, training, useful work, recovery, farming, and the existing small contest
support several enjoyable days with one individual critter. Minimal preparation
must stop the original novice Pip and berry-only assumptions from spreading.

Use [GAME-DESIGN.md](../../GAME-DESIGN.md) for gameplay semantics,
[ARCHITECTURE.md](../../ARCHITECTURE.md) for current boundaries and saves, and
[DEVELOPMENT.md](../../DEVELOPMENT.md) for verification. These are linked context,
not documents to copy into this plan on every continuation.

### Player-visible milestone rule

Following foundational milestones M1 and M2, each implementation milestone must
produce a clear, player-observable consequence during ordinary play. If work only
prepares architecture for a later player-facing change, it should normally be
treated as a supporting subtask rather than represented as the complete product
milestone.

Milestone player-visible expectations:

- **M1**: Intentionally minimal player-visible change (foundational identity and save v2).
- **M2**: Intentionally minimal player-visible change (foundational learning structure).
- **M3**: Must make an ordinary day materially different from the currently published build.
- **M4**: Adds a second useful learned job that changes what the player personally needs to do.
- **M5**: Gives today's choices an understandable consequence or purpose for tomorrow.
- **M6**: Evaluates whether the repeated one-critter loop is actually enjoyable enough to proceed to the opening.

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
**Player-visible expectation:** intentionally minimal player-visible change (foundational identity and save isolation).

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

**Status:** complete and published (2026-09-26) as `6b7cf49`, based on published M1. Verification, publication record, and human playtest findings below.
**Player-visible expectation:** intentionally minimal player-visible change (foundational learning structure).

- [x] Replace berry-only knowledge assumptions with a small authored behavior
      definition and per-individual learned progress. Do not create a general AI
      planning engine or implement teaching NPCs yet.
- [x] Observation, eligibility for cues, opportunity recognition, and autonomous
      work retain visible feedback and condition/proximity/resource checks.
- [x] Existing berry knowledge migrates without relearning or duplicated rewards;
      invalid saves stay protected. Tests demonstrate stage transitions,
      individual isolation, rejected actions, and seeded/save continuity.
- [x] Browser play shows the existing learning arc and explains why the companion
      does or does not act. No extra job is needed to finish this milestone.

### M3 — Make care, effort, and recovery produce a daily choice

**Status:** defined and ready; not started. Concrete mechanics and acceptance criteria specified below so the next session can execute without inventing its own design.
**Player-visible expectation:** must make an ordinary day materially different from the currently published build.

The core daily choice is whose energy to spend, what to preserve energy for, and
whether spending time recovering is worthwhile.

#### Daily choice and recovery design

- **Daytime recovery action ("Rest together")**:
  - Located at the companion's nook in Bramblewick Yard.
  - Consumes a substantial amount of game time (provisional starting range: 90–120 game minutes).
  - Restores both player energy (provisional: ~+30) and active-critter energy (provisional: ~+35),
    capped at the normal maximum.
  - Does not reduce hunger, reset once-per-day activities, advance to tomorrow, or replace overnight sleep.
  - Consumable recovery items are anticipated as a possible later system, but are explicitly **not** part of M3.
- **Retune work and training costs**:
  - Energy must become a meaningful daily constraint rather than an abundant resource.
  - Provisional starting tuning parameters (not immutable balance canon):
    - Practice: roughly 30 critter energy.
    - Clover Cup: roughly 35 critter energy.
    - Critter sunberry work: roughly 12 critter energy.
    - Player work costs adjusted modestly where needed to make the choice real.
- **Sensible routines from comparable morning states**:
  - _Competition-oriented day_: preserve more critter energy for practice and/or the Clover Cup;
    the player may personally perform more chores.
  - _Work-oriented day_: allow the critter to contribute more useful work, preserving more of the
    player's energy but leaving less critter energy for training or competition.
  - _Rest together_: a player can choose to do more of both, but the clock time consumed makes
    recovery a meaningful tradeoff rather than a free refill.
  - There must not be one obviously correct routine.
  - Learned autonomy must not become "free productivity": a critter helping with work spends condition
    and energy that the player may have wanted for something else.
  - A player must be able to recover from an ordinary exhausted or poorly scheduled day through normal
    play without a developer reset, forced overnight sleep as the only solution, compulsory grind, injury, or death.
- **Interaction UI requirement (compact bottom interaction dock)**:
  - The current large ordinary nearby-action card must be replaced during M3 with a compact bottom
    interaction dock or equivalent low-profile treatment that preserves visibility of the world.
  - Ordinary proximity interaction must occupy much less vertical space.
  - Target/status and actions must remain immediately legible.
  - Disabled/action reasons may use a small secondary line when needed.
  - The dock must not substantially obscure the player, critter, nearby target, path, or surrounding explorable area.
  - Responsive/narrow layouts must remain usable.
  - Dedicated activity UIs (such as training) may remain larger because the activity is the focal task.
- **Cost and result communication**:
  - Costs and consequences must be legible before and after commitment.
  - Where an activity consumes meaningful time or energy, the UI must communicate those costs before starting
    (resolving inconsistencies such as practice and racing displaying energy but omitting time).
  - Results must make consequences visible afterward, including remaining condition and energy.
  - Build descriptively from the existing stamina and condition model rather than adding a redundant fatigue meter.
- **Guardrails / non-goals**:
  - Do not add a second learned job in M3 (remains M4).
  - Do not add Grandpa, the opening, town systems, a party UI, injury, mortality, consumable recovery items,
    a broad fatigue simulation, a new farming/crafting economy, or major competition expansion.
  - Do not add a hard once-per-day restriction to ordinary training merely to force balance; repeated
    training and resting may remain possible so testing can determine whether it becomes degenerate or grindy.

#### Acceptance criteria

- [ ] Add the daytime recovery action **Rest together** at the companion's nook, consuming substantial
      game time (provisional ~90–120 game minutes) and restoring both player energy (~+30) and
      active-critter energy (~+35, capped at max), without reducing hunger, resetting daily limits,
      advancing the date, or replacing overnight sleep.
- [ ] Retune work and training costs (provisional: practice ~30 critter energy, Clover Cup ~35 critter energy,
      critter sunberry work ~12 critter energy, and modest player work adjustments) so energy is a tangible
      constraint and critter work visibly spends condition.
- [ ] Replace the large nearby-action card with a compact bottom interaction dock or equivalent low-profile
      treatment that keeps targets, statuses, and actions immediately legible without substantially obscuring
      the player, companion, path, or explorable area on narrow and desktop viewports.
- [ ] Display activity time and energy costs before commitment, and show consequences (including remaining
      condition/energy) afterward, using the existing stamina/condition model.
- [ ] A player can recover from ordinary exhaustion or poor scheduling through normal play without developer
      reset, forced overnight sleep as the only solution, compulsory grind, injury, or death.
- [ ] Demonstrate from comparable morning states at least one work-oriented routine and one competition-oriented
      routine with visibly different tradeoffs and resulting state. A human player encounters meaningful tradeoffs:
      "Should I do this work myself?", "Should my critter spend energy doing it?", "Should we save that energy
      for training or competition?", "Is it worth spending part of the day resting so we can do more?"
      Automated tests alone cannot declare success: if normal play still amounts to blindly performing every
      available action without meaningful scheduling or resource consideration, M3 product acceptance is not met.
- [ ] Unit, persistence, and browser checks verify state rules, energy limits, clock progression, persistence,
      and layout without regressions.

### M4 — Add one useful learned job

**Status:** not started; choose the job after M2/M3 evidence.
**Player-visible expectation:** adds a second useful learned job that changes what the player personally needs to do.

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
**Player-visible expectation:** gives today's choices an understandable consequence or purpose for tomorrow.

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
**Player-visible expectation:** evaluates whether the repeated one-critter loop is actually enjoyable enough to proceed to the opening.

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

These adapted M1 local results do not claim an unmodified browser run or deployment;
the publication record below supersedes the original publication blocker.
No physical-pad or fresh-human fun assessment was performed.

### Commit and publication record

The recovered M1 commits were applied and pushed. Fetching GitHub on 2026-09-26
confirmed `origin/main` at `346b232`; publication is complete. Actual published IDs:

- `7e14cac` — documentation bootstrap (same tree as the earlier local `3a346fc`).
- `44c4f7d` — campaign language and individual-value principle (recovered `6f65e7c`).
- `122a6ea` — M1 implementation, migration, verification, and canonical docs
  (recovered `9cf27dc`).
- `346b232` — M1 delivery notes, whose original publication blocker is resolved.

Do not reapply the M1 patch. The [Pages run for `346b232`](https://github.com/cboler/critterstead/actions/runs/36250030032)
and its secret scan both completed successfully, verified on 2026-09-26. This
supersedes M1's pending standard-CI/deployment caveat, while its physical-controller
and fresh-human playtest gaps remain. This checkout's unrelated older roster/Clover Cup commits through
`a6324f8` were preserved on local `codex/preserved-roster-clover-cup`; M2 starts
from published main and does not incorporate that divergent work.

## M2 evidence — 2026-09-26

Implementation and verification complete, based on published `346b232`:

- Authored `sunberry-foraging` stages/gains/feedback replace runtime berry-knowledge
  fields. Progress belongs to each individual; berry execution remains in the host.
  Shared eligibility/opportunity checks drive work and visible waiting explanations.
- Save v3 explicitly migrates all v2 individuals and chains v1 through v2. Frozen
  fixtures preserve independent owners, participant-bound paid activity, knowledge,
  skills, history, resources, economy, and random seed. Unknown/conflicting learning
  data remains protected. See [D17](../../DECISIONS.md#d17--authored-learning-and-save-v3-implemented-2026-09-26).
- `npm test -- --watch=false`: 71 tests passed. Golden values captured directly from
  the unchanged host at `346b232` verify observation, cue, and autonomous rewards,
  costs, progress, skill gains, and seeds. Reload during approach and every learning
  stage, rejected work, no duplicate rewards/milestones, and dormant expert isolation
  are covered. `npm run lint` passed.
- Production build at `/critterstead/` passed (904.89 kB initial raw bundle); SPA
  fallback, manifest and service-worker assets verified. `npm run check:pwa` passed
  in installed Edge: offline world rendering and care persisted at that subpath.
- Local Windows environment: Node 26.8.2, npm 11.19.1, locked dependencies (including
  Playwright 1.63.0 / Chromium 153.0.8010.12). Angular compiler needed the supported filesystem permission
  path to read ancestor directories. Chromium runs without M1's temporary browser
  adaptations. Physical-controller and fresh-human playtests remain unperformed.
- Initial trace-enabled suite: 45 passed, 8 intentional viewport skips, 3 failures.
  Two failures exhausted the keyboard helper's fixed corrections under slow traced
  rendering; a bounded 30-second steering budget retains the same arrival tolerance.
  The other exposed a real seven-pixel desktop rail overflow from duplicated learning
  guidance. The card now shows the current action/reason, with the general hint at
  the bush. A further five-pixel overflow at 1920×1080 was removed by shortening
  the status text. Follow-up normal-input full days passed at 390×844 and 1280×800;
  the unchanged layout assertions passed at 1280×800, 1440×900, and 1920×1080.
- `npm run format` and `npm run format:check` passed. Formatting also normalized
  checkout line endings; it introduced no unrelated content changes. Local Markdown
  file links and `git diff --check` passed.
- Final standard browser suite: `npm run e2e -- --workers=1 --output=test-results/m2-final`:
  **48 passed, 8 intentional viewport skips, zero failures (5.9 minutes)**.
  All four viewports pass migration, malformed/newer save protection, tab ownership,
  and ordinary reload. Complete normal-input days pass on phone and desktop;
  mocked standard-controller input and all three desktop layout sizes pass.

Final production commands were `npm run build -- --base-href /critterstead/`,
`node scripts/prepare-pages.mjs`, and `npm run check:pwa`. Final unit, lint, and
format checks passed after the feedback/layout repair. No dependency, workflow,
world renderer, input-route, or recovery/balance change was needed.

### Browser observations

The normal-input day still pets/feeds Mallow, practices three timed cues, plants and
waters feed, travels to Clover Glade, demonstrates three harvests, reloads at the
cued stage, gives two harvest cues, and watches independent work. The existing
selling, shed improvement, crop harvest, trial, sleep and day-two reload follow.
No progress is granted through development tools; Angular state is read only for
position/timing observations. The separate v2 migration scenario deliberately seeds
a frozen save, including hungry Mallow and a dormant Grandpa-owned expert.

The [observation screenshot](../evidence/001-m2/phone-observation.png) shows the
first learned mark and Mallow's watching milestone. The
[narrow migration screenshot](../evidence/001-m2/phone-needs-feed.png) shows an
independent companion who retains seven learning marks and has energy, but waits
because of hunger. The card explains “Feed Mallow before asking for more work,”
and the cue is disabled. In the ordinary day, the last bush becomes depleted after
autonomous work, the [desktop view](../evidence/001-m2/desktop-independent.png)
names Mallow's harvest in the journal, and the card explains that no ripe bush is
nearby. The [day-two reload](../evidence/001-m2/desktop-day-two.png) retains learning,
renewed energy, age, and the improved homestead. The player can distinguish learned capability from an available
opportunity or a condition limit. These are inspected browser results, not human
feedback about pacing or fun.

The narrow layout still scrolls vertically and the interaction card obscures part
of the diorama; M1's existing friction remains. The day-two starter checklist stays
completed. M2 does not attempt recovery balancing or next-day goals.

### M2 commit and publication

Stable implementation/evidence commit: `6b7cf49a887c4b4efd534aaae7e0c63d0b2fda28`
— Generalize individual learning while preserving sunberry foraging.
Pushed directly to `origin/main`; `git ls-remote origin refs/heads/main` returned
that exact SHA on 2026-09-26. The secret scan succeeded. The
[Pages workflow](https://github.com/cboler/critterstead/actions/runs/36286480339)
completed successfully: Node 24 formatting, lint, unit tests, production build,
standard Chromium browser tests, production offline persistence, artifact upload,
and Pages deployment all passed. CI logs confirm 71 unit tests and 48 browser tests
passed, with 8 intentional skips and no failures/flaky results; the browser suite
took 14.3 minutes. Build/validation took 15m27s; deployment took 12s.
For context, published M1's successful browser step alone took 16m05s on GitHub;
the longer hosted run was not evidence of a failing M2 check.

This final documentation-only handoff uses `[skip ci]`; the deployed application
remains exactly the verified `6b7cf49` implementation. M3 is not started.

## Human playtest findings and process lessons — 2026-09-26

Human playtest evaluation following M1 and M2 yielded the following observations and
workflow corrections:

### Save migration vs. fresh-start testing

- The first human M2 playthrough initially appeared almost identical to the original
  prototype because it used a migrated legacy save whose active critter was still Pip.
- This was expected save-preservation behavior: M1 deliberately preserves an existing
  critter’s identity instead of silently renaming or replacing it.
- A fresh homestead, reached through the built-in developer reset, correctly begins with
  provisional player critter Mallow.
- **Testing process lesson**: A browser hard refresh (such as `Shift+F5`) does **not**
  create a fresh Critterstead save because the homestead is persisted in IndexedDB.
  To test fresh-start behavior, open the developer field kit using the backtick key
  (`` ` ``), select **Reset saved game**, and confirm. Human test instructions must
  explicitly explain how to create a fresh save and clearly distinguish fresh-start
  testing from migration testing.

### Product pacing and player visibility

- Even after inspecting the intended Mallow fresh-start state, the human assessment is
  that M1 and M2 remain overwhelmingly foundational and produce little visible gameplay
  change.
- That is acceptable for those completed milestones, but subsequent milestones in this
  campaign must start paying off the foundation in ordinary play (codified in the
  **Player-visible milestone rule**).
- Subsequent milestones must produce clear player-observable differences in ordinary
  play, beginning with M3.

### Interaction UI friction

- The existing nearby interaction card was confirmed as significant human-playtest
  friction. It occupies too much of the lower-center world view and obscures the
  character, companion, path, and explorable area precisely when the player approaches
  something to inspect or use.
- This finding motivates the M3 requirement to replace the card with a compact bottom
  interaction dock or equivalent low-profile treatment.

## Current handoff

- **Completed:** M1 (identity, ownership, save v2, provisional Mallow) and M2 (authored
  learning, per-individual progress, explicit v1/v2 → v3 migration, published in `6b7cf49`);
  human playtest findings and testing lessons recorded; M3 concretely specified with daily
  energy choice, daytime "Rest together", retuned costs, legible pre/post activity feedback,
  and compact interaction dock; canonical narrative and ownership distinctions reconciled.
- **Known limits:** single rendered/simulated companion; nearby interaction card obscures
  world navigation (addressed in M3); physical controller testing pending.
- **Publication:** M1 and M2 are on `origin/main` (commits `122a6ea`, `346b232`, `6b7cf49`,
  and `03516a1`). This documentation-only update builds on the published M2 baseline.
- **Exact next gameplay action:** when continuing this campaign, start **M3 — Make care,
  effort, and recovery produce a daily choice**. Astra can execute M3 directly using the
  concrete specification:
  1. Add **Rest together** action at the companion's nook in Bramblewick Yard (90–120 game
     minutes, restoring ~+30 player / ~+35 critter energy, capped at max).
  2. Retune training/practice, Clover Cup, and critter/player work costs so energy becomes a
     real daily constraint.
  3. Replace the large nearby interaction card with a compact bottom interaction dock.
  4. Make time and energy costs legible before commitment and show consequences
     (including remaining condition/energy) afterward.
  5. Demonstrate at least one work-oriented routine and one competition-oriented routine
     from comparable morning states with visibly different tradeoffs and resulting state.
