# 001 — The First Living Stead (Deepen the One-Critter Daily Loop)

**Status:** M1 and M2 complete and published on 2026-09-26 (M1: `122a6ea`, M2: `6b7cf49`).
M3 implementation and local verification complete and merged into `main` via PR #1
(`d9ba9d7`) on 2026-09-27; human evaluation concluded (see recorded findings below).
M4–M9 restructured to systematically build the first living stead vertical slice.
M4–M6 merged to `main` via PR #2. M7 (save v7) and M8 (save v8) complete and locally
verified on 2026-09-29. M9 built on 2026-09-30; the campaign gate awaits the product
owner.
Source baseline: `3a346fc` (documentation bootstrap on gameplay `06aa91e`),
identical in content to the published bootstrap `7e14cac`.

## Outcome and scope

Evolve the current narrow prototype into a rich, living stead vertical slice with one
companion. Expand the daily loop from isolated berry picking into an interconnected
system: rancher stats and skills, extensible simulation checks, physical logistics and
localized storage, simple production refining, multi-crop seasonal farming, cottage
interior with a 120-day calendar, and diverse activity-matched training minigames.

Use [GAME-DESIGN.md](../../GAME-DESIGN.md) for gameplay semantics,
[ARCHITECTURE.md](../../ARCHITECTURE.md) for current boundaries and saves, and
[DEVELOPMENT.md](../../DEVELOPMENT.md) for verification. These are linked context,
not documents to copy into this plan on every continuation.

### Player-visible milestone rule

Following foundational milestones M1 and M2, each implementation milestone must
produce a clear, player-observable consequence during ordinary play ([D18](../../DECISIONS.md#d18--player-visible-milestone-rule-after-foundation)).
If work only prepares architecture for a later player-facing change, it should normally
be organized as a supporting subtask rather than represented as a standalone product
milestone.

Milestone player-visible expectations:

- **M1**: Intentionally minimal player-visible change (foundational identity and save v2).
- **M2**: Intentionally minimal player-visible change (foundational learning structure and save v3).
- **M3**: Makes an ordinary day materially different: energy tradeoffs, daytime **Rest together**,
  retuned costs, and a compact bottom interaction dock unblocking viewport stability.
- **M4**: Adds rancher STR/END/SPD/INT stats, skills, pure host check engine, physical timber/rock
  nodes, and graduated physical encumbrance.
- **M5**: Eliminates magical global inventory: localized storage containers (chests, satchels,
  hoppers), physical carrying, and the first sawmill production chain with emergent failure chains.
- **M6**: Generalizes learning to compositional tasks: companion learns to haul finished lumber
  from sawmill to chest, with basic autonomous self-management (eating and resting).
- **M7**: Expands farming to a 4-plot seasonal crop grid (soil moisture, watering) and unlocks
  the cottage interior with an inspectable 120-day household calendar.
- **M8**: Expands training into diverse minigames (boulder lifting, distance pacing) with daily
  diminishing returns, and unlocks the Colosseum exhibition trial.
- **M9**: Comprehensive integration, multi-day playtesting, and campaign product evaluation gate.

**Non-goals for Campaign 001:** full opening prologue with Grandpa and Pip in town,
inhabited Oakhaven town simulation with NPC schedules, multi-critter 3-companion party
traveling together, barn capacity expansions, breeding loom/artificial growth tech,
real-time dungeon exploration combat, and networking. Do not use this campaign as
permission to build speculative frameworks for deferred stages.

Campaign completion requires an intact save-safe game, understandable choices
and observable learning, a repeat-day playtest record, and an explicit product
assessment. Automated gates alone cannot mark “fun proven.” A pending human
playtest is a pending product gate, not a claim of failure or success.

---

## Milestones

### M1 — Establish distinct critter identity and ownership

**Status:** complete (2026-09-26). All acceptance criteria below verified; see evidence and environment limitations.
**Player-visible expectation:** intentionally minimal player-visible change (foundational identity and save isolation).

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

**Status:** implementation complete and merged into `main` via PR #1 (`d9ba9d7`, 2026-09-27); human product acceptance pending.
**Player-visible expectation:** must make an ordinary day materially different from the currently published build.

#### Acceptance criteria

- [x] Add the daytime recovery action **Rest together** at the companion's nook, consuming substantial
      game time (120 game minutes) and restoring both player energy (+30) and
      active-critter energy (+35, capped at 100), without reducing hunger, resetting daily limits,
      advancing the date, or replacing overnight sleep.
- [x] Retune work and training costs (practice 30 companion / 5 player energy, Clover Cup 35 / 5 energy,
      critter sunberry work 12 / 2 energy, and existing player work costs) so energy is a tangible
      constraint and critter work visibly spends condition.
- [x] Replace the large nearby-action card with a compact bottom interaction dock that keeps
      targets, statuses, and actions immediately legible without substantially obscuring the
      player, companion, path, or explorable area on narrow and desktop viewports.
- [x] Display activity time and energy costs before commitment, and show consequences (including remaining
      condition/energy) afterward, using the existing stamina/condition model.
- [x] A player can recover from ordinary exhaustion or poor scheduling through normal play without developer
      reset, forced overnight sleep as the only solution, compulsory grind, injury, or death.
- [x] Demonstrate from comparable morning states at least one work-oriented routine and one competition-oriented
      routine with visibly different tradeoffs and resulting state. (Evaluated through human playtest on 2026-09-27.
      Result: The criterion that Rest together create a materially different, choice-driven daily loop was NOT
      demonstrated in play; the game still felt fundamentally the same. As resolved by design review, M3 is
      concluded rather than reopened, and does not block M4; this outcome validates the need for the expanded
      M4–M9 multi-system runway rather than further tuning of Rest alone.)
- [x] Unit, persistence, and browser checks verify state rules, energy limits, clock progression, persistence,
      and layout without regressions (80 unit tests, 52 browser tests pass).

### M4 — Rancher stats, generalized checks, and physical encumbrance

**Status:** complete and locally verified on `codex/first-living-stead`, based on `f1c86a4`.
**Player-visible expectation:** The rancher gains STR, END, SPD, INT stats and primary skills; physical resource nodes (timber, boulders) appear in the world; chopping/breaking them triggers the host check engine with visible degree of success, stamina drain, and movement slowdown when carrying heavy materials.

- [x] Add STR, END, SPD, INT capability stats and primary skills (Woodcutting, Mining,
      Hauling, Foraging) to `state.player`, using a shared `ActorCapabilities` model
      compatible with critters.
- [x] Implement the pure host check resolution engine:
      `resolveCheck(actor, skill, statWeights, toolQuality, difficulty) -> CheckResult`,
      returning success degree, stamina cost, time elapsed, and skill/stat experience.
- [x] Add new physical resource nodes in Bramblewick Yard and Clover Glade: fallen timber
      logs (chopped for timber) and quarry boulders (cracked for stone).
- [x] Interacting with timber/rock nodes initiates the check: skill, stats, and tool quality
      visibly dictate swing speed, stamina spent, and damage dealt to the node.
- [x] Implement graduated physical encumbrance: carrying harvested timber or stone mass
      noticeably reduces movement speed and increases stamina consumption.
- [x] Decouple the Three.js viewport canvas from the bottom interaction dock to ensure layout
      stability ([D32](../../DECISIONS.md#d32--viewport-decoupling-from-interaction-dock-ui)).
- [x] Performing checks awards visible experience to relevant skills and slow organic gains
      to contributing stats.
- [x] Unit, persistence, and browser checks verify state rules, check resolution, encumbrance
      penalties, and save migration without regressions.

### M5 — Localized storage, physical carrying, and first production chain

**Status:** complete and locally verified (2026-09-28), following pushed M4 `5290082`.
**Player-visible expectation:** Items physically exist in designated containers (wooden yard chest, companion satchel, machine hoppers); player and critter can physically carry cargo and deposit it; a sawmill/chopping block refines logs into lumber, stalling if input is exhausted or output is full.

- [x] Decompose the global `state.inventory` array into localized `Container` entities:
      player backpack, critter satchel, yard storage chest, and workstation hoppers.
- [x] Implement physical carrying mechanics: player and active critter can pick up, visually
      hold, and deposit items into nearby containers.
- [x] Add the first refining workstation: **Woodchopping Block / Sawmill** in Bramblewick Yard.
- [x] Workstation state machine: consumes logs from its input hopper over time to produce
      refined lumber in its output crate.
- [x] Emergent failure chain: if the input hopper runs out of logs or the output crate reaches
      capacity, the machine halts and displays an inspectable explanation.
- [x] Save migration explicitly converts existing global inventory into the player's primary
      backpack container without item loss.
- [x] Unit and browser tests verify container transfers, physical carrying, production cycles,
      stoppage conditions, and save safety.

### M6 — Compositional learning and first autonomous job (Hauling)

**Status:** complete locally (2026-09-28); save v6, learned route and worker self-care verified.
**Player-visible expectation:** The companion observes the player carrying lumber from sawmill to storage chest, learns hauling through cues, and independently clears sawmill output; companion self-manages basic needs by eating and resting when needed.

- [x] Generalize `BEHAVIORS` to multi-step compositional jobs: author `lumber-hauling`
      behavior with ordered stages (unfamiliar, observing, cued, autonomous).
- [x] Companion learns by watching player haul lumber from the sawmill output crate to the
      yard storage chest.
- [x] Autonomous hauling: when independent, companion recognizes finished lumber in the
      sawmill output, picks it up, carries it to the yard chest, and deposits it.
- [x] Basic critter self-management: if hunger exceeds threshold, companion seeks food from
      the feed trough; if stamina is exhausted, companion rests at the nook before resuming work.
- [x] Delegating hauling visibly reduces player chores, freeing player time for training or
      resource gathering.
- [x] Save continuity, unit tests, and Playwright verification of the autonomous hauling cycle.

### M7 — Multi-crop farming, cottage interior, and household calendar

**Status:** complete and locally verified (2026-09-29); save v7. Evidence below.
**Player-visible expectation:** Farming expands into a 4-plot garden grid supporting multiple seasonal crops with soil moisture; the player can enter the cottage interior diorama and inspect the 120-day wall calendar.

- [x] Replace the single `state.crop` with a 4-plot garden grid.
- [x] Add seasonal crop species (sunberries, crisp turnips, grain wheat) with distinct seed
      requirements, growth stages, and water needs.
- [x] Soil plots track moisture: tilling and watering are required for daily growth; dry
      plots pause growth.
- [x] Unlock the cottage interior door: walking to the cottage door transitions into the
      authored cottage interior diorama (hearth, bed, kitchen counter, calendar).
- [x] Add an inspectable **wall calendar** inside the cottage displaying the 120-day year
      (4 seasons $\times$ 30 days), current date, weather forecast, and upcoming event fixtures.
- [x] Transitioning between cottage interior and yard preserves state, companion position,
      and simulation clock.
- [x] Unit, persistence, and browser tests verifying garden grid, multi-crop growth, diorama
      transitions, and calendar display.

### M8 — Diverse training disciplines and Colosseum exhibition

**Status:** complete and locally verified (2026-09-29); save v8. Evidence below.
**Player-visible expectation:** Training expands to include activity-matched minigames for Strength (Boulder Lifting) and Endurance (Distance Pacing) with daily diminishing returns; the Colosseum gate opens into an athletic exhibition arena.

- [x] Implement two new interactive training minigames: - **Boulder Lifting / Pressing** (STR): rhythmic force-gauge balance against visible weight. - **Distance Pacing / Sprint Relay** (END/SPD): sustained movement and stamina pacing challenge.
- [x] Implement daily diminishing returns: repeatedly training the same discipline on the
      same game day yields progressively reduced stat/skill gains, discouraging grind and
      rewarding balanced daily schedules.
- [x] Open the path to the Colosseum: player and companion can enter the skeletal Colosseum diorama.
- [x] Implement the **Colosseum Athletic Exhibition Trial**: a multi-stage athletic showcase
      combining speed and strength checks with spectator fanfare and coin/medal rewards.
- [x] Unit and browser tests verify minigame mechanics, diminishing returns curve, Colosseum
      transition, and rewards.

### M9 — Vertical slice integration, multi-day playtesting, and campaign gate

**Status:** built 2026-09-30 ([evidence](#m9-evidence--2026-09-30)); the formal gate
awaits the product owner.
**Player-visible expectation:** A cohesive, multi-day vertical slice demonstrating the full living stead loop across 3+ days with genuine choices, delegation, progression, and exhibition competition; evaluated via a structured human playtest protocol.

- [x] Demonstrate a seamless multi-day gameplay loop: tending 4-crop garden, gathering wood/stone,
      refining lumber at sawmill, watching companion autonomously haul lumber, balancing training
      across hoop/lift/pace minigames, resting together, consulting the cottage calendar, and
      competing in Colosseum exhibitions.
- [x] Comprehensive quality gates: unit tests, lint, production build at `/critterstead/`,
      PWA offline persistence check, and multi-day browser walkthrough.
- [x] Verified save migration pipeline supporting all legacy versions (v1–v7) without
      data loss or reset.
- [x] Human playtest protocol and evaluation report: assessing whether care feels meaningful,
      learning is rewarding, physical logistics feel satisfying, and repeated days feel engaging.
      Playtest 1 is recorded and its findings fixed; the product owner's playtest of the M9
      build is pending.
- [ ] Formal campaign exit gate: record findings, update roadmap, and authorize entry into
      Stage 2 (Household and Opening). Do not begin Stage 2 automatically. Findings and
      roadmap are recorded; authorization is the product owner's decision.

---

## M1 evidence — 2026-09-26

### Baseline walkthrough

Ran the unchanged gameplay at `3a346fc` (gameplay `06aa91e`) with Playwright's
normal-input complete-day scenario at 1280×800. It petted/fed Pip, practiced three
cues, planted/watered feed, walked to Clover Glade, demonstrated three harvests,
issued two gathering cues, observed autonomous foraging, sold berries, improved
the shed, harvested feed, ran the Clover Cup, slept, reloaded, and inspected the
journal. One scenario passed in 1.6 minutes.

### Implementation and verification

- Schema v2, provisional Mallow, explicit ownership and selection, per-individual
  petting, participant-bound activities, and identity-derived UI/world text are
  implemented. See [D16](../../DECISIONS.md#d16--minimal-identity-model-and-save-v2-implemented-2026-09-26).
- 35 host/storage tests passed. Browser suite: 36 passed, 8 intentional viewport
  skips, zero failures.
- Published to `origin/main` as `122a6ea` / `346b232`.

---

## M2 evidence — 2026-09-26

- Authored `sunberry-foraging` stages/gains/feedback replace runtime berry-knowledge
  fields. Progress belongs to each individual; berry execution remains in the host.
- Save v3 explicitly migrates all v2 individuals and chains v1 through v2.
  See [D17](../../DECISIONS.md#d17--authored-learning-and-save-v3-implemented-2026-09-26).
- 71 host/storage tests passed. Browser suite: 48 passed, 8 intentional skips, zero failures.
- Published to `origin/main` as `6b7cf49`.

---

## Human playtest findings and process lessons — 2026-09-26

### Save migration vs. fresh-start testing

- The first human M2 playthrough used a migrated legacy save whose active critter was still Pip.
- A browser hard refresh (`Shift+F5`) does **not** reset IndexedDB.
- To test fresh-start behavior, open developer kit with backtick (`` ` ``), select **Reset saved game**, and confirm.

### Product pacing and player visibility

- M1 and M2 were foundational; subsequent milestones must produce clear player-observable
  differences in ordinary play (**Player-visible milestone rule**).

---

## M3 implementation and evidence — 2026-09-27

Based on `b8d8203`, delivered and merged via PR #1 (`d9ba9d7`) on 2026-09-27.

### Implemented rules and decisions

- **Rest together at the nook:** 120 minutes, up to +30 player / +35 companion
  energy, capped at 100, without a supply or upgrade requirement. Rest increases hunger
  by 3 and advances crop/berry clocks without resetting daily limits.
- **Effort:** practice costs 30 companion / 5 player energy, trial 35 / 5, and companion harvest 12 / 2.
- **Autonomy:** requires 32 energy so a 12-energy harvest leaves at least 20 in reserve.
- **Presentation:** compact interaction dock below world canvas; costs and results legible.
- **Saves:** no new schema version needed; saved paid activities complete without being recharged.

### Local verification complete

-

pm test -- --watch=false`: **80 passed**, covering cost boundaries, continuity, rest rules,
and autonomous reserve.
-

pm run lint`, Prettier format check, `git diff --check`: passed.

- Production build at `/critterstead/` and
  pm run check:pwa`: passed (907.89 kB bundle).
-

px playwright test`: **52 passed, 12 intentional skips**, zero failures.

### Comparable routine evidence

[Recorded routine states](../evidence/001-m3/routine-comparison.json) demonstrate distinct outcomes:

| Result before sleep                      | Work-oriented day | Competition-oriented day |
| :--------------------------------------- | :---------------- | :----------------------- |
| Practice / companion harvests            | 1 / 3             | 2 / 0                    |
| Player harvests                          | 3                 | 6                        |
| Nook rest                                | 120 minutes       | None                     |
| Clock before sleep                       | 15:57             | 14:40                    |
| Player / companion energy                | 86 / 34           | 37 / 5                   |
| Foraging knowledge                       | 8, independent    | 6, cued                  |
| Harvesting / racing skill                | 3 / 3             | 0 / 4                    |
| Speed / endurance                        | 4.99 / 5.35       | 5.76 / 5.62              |
| Bond / hunger                            | 32 / 11.93        | 31 / 10.01               |
| Coins / stored feed / seeds / nook level | 11 / 6 / 3 / 1    | 11 / 6 / 3 / 1           |

Captured screenshots: [phone-nook-choice](../evidence/001-m3/phone-nook-choice.png),
[desktop-recovered](../evidence/001-m3/desktop-recovered.png),
[desktop-competition](../evidence/001-m3/desktop-competition.png),
[phone-reserve](../evidence/001-m3/phone-reserve.png).

### Human product evaluation — completed (2026-09-27)

The outstanding human comparison between M3 routines has been conducted on the deployed M3 build:

- **Playtest findings**: The game still felt fundamentally and materially the same as before.
  The main immediately obvious addition was that the rancher and critter can now Rest together
  at the shed/nook.
- **Acceptance assessment**: The unresolved M3 product criterion—that Rest together and retuned
  energy costs create a materially different and meaningfully choice-driven daily loop—was
  **NOT demonstrated** by human play.
- **Strategic resolution**: M3 is **not** reopened, and M4 is **not** blocked on further M3 work.
  The lesson of this evaluation is emphatically not "fix Rest together again." A single recovery
  verb in isolation cannot create a compelling, choice-driven loop. Instead, this finding validates
  why Campaign 001 was expanded into the comprehensive M4–M9 First Living Stead runway: meaningful
  daily trade-offs require interconnected physical resource nodes, hauling logistics, processing
  chains, multi-crop farming, and varied training minigames.
- **Outcome**: M3 is formally closed with this finding recorded in project history. M4 is unblocked.

---

## M4 evidence — 2026-09-27

- Shared ActorCapabilities, deterministic degree-based checks, visible timed axe/pick
  work, timber/stone sites in both areas, organic gains, carried meshes, persistent
  dropped cargo, four encumbrance bands, and fixed viewport/dock layers implemented.
- 86 unit tests pass (80 baseline + six focused check/work/migration scenarios).
  Paid work reloads without a second charge or reward; legacy v3 fixture retains all
  existing progress. Rejected actions and overload recovery are covered.
- Browser work loop passes on phone and desktop, including normal-key walking,
  chopping, mining, heavy load, drop/pickup across reload, and equal canvas dimensions.
  Responsive smoke passes all four viewports; desktop layout passes three sizes.
  Focused run: 7 passed, 5 intentional skips. Phone/desktop cargo screenshots inspected.
- Lint, production /critterstead/ build and Pages assets pass. Build has a nonblocking
  16.48kB component stylesheet warning (20kB error budget unchanged).
- Provisional: fractional skill gains, slow stat gains, resource difficulty/respawn,
  8kg timber/12kg stone, load thresholds, starter tools, 180px reserved interaction bay.
  No tool durability, tool selection, or cargo physics solver is claimed.

## Current handoff

M1–M9 built and published on `main`; playtests 1 and 2 are recorded and their findings
fixed. Next: collect the remaining testers' feedback (protocol in DEVELOPMENT.md) and
hold the planned vision sessions; then the product owner decides the Stage 2 gate. Do
not begin Stage 2 before that decision.

M4 desktop persistence suite: 9 passed, including v1/v2 migration, paid activity,
malformed/future/ambiguous save protection, and single-writer ownership.
Inspected evidence: [phone timber](../evidence/001-m4/phone-timber.png) and
[desktop heavy cargo](../evidence/001-m4/desktop-heavy.png).

## M5 implementation notes — 2026-09-27

Save v5 explicitly moves every legacy inventory stack into the rancher's backpack,
keeping IDs, quantities, quality, ground cargo, work, seed, and paid activities intact.
Each persistent critter receives its own satchel. Chests, trough and mill buffers are
fixed local containers with item filters and unit capacities. Player supplies stay
in the backpack; gathered companion berries stay in that individual's satchel.
The honesty stall can sell the nearby companion's berries, never distant storage.

The yard sawmill makes two lumber per timber per 12 game minutes. It does not consume
an input until output fits, never banks stopped time, and continues during ordinary
actions and overnight. Transfers use local interaction commands, preserve quality,
reject full destinations atomically, and let the nearby companion carry/deposit.
The trough is positioned away from the nook interaction so Rest remains accessible.
These placements, rates, capacities and mass coefficients remain provisional.

M5 unit verification: 91 passed. New checks cover transfer conservation/locality,
per-individual satchels, full/empty production stoppage and reload, frozen v4 migration,
and malformed container protection. M6 will add learning and autonomous task phases;
current companion container transfers are direct player instructions.

### M5 verification completed — 2026-09-28

- 91 unit tests, lint, /critterstead/ production build, SPA/manifest/service-worker
  assets, and production offline care persistence pass. The offline harness now
  waits for actual prefetched caches before disconnecting (initial controller
  activation can race first-install caching). Stylesheet warning remains 16.48kB.
- The selected desktop browser set covers controller input, M4 work/cargo, all nine
  persistence scenarios and the new production route. Two initial failures were
  corrected: an exact button-name assertion omitted the desktop E hint, and a
  save test was interrupted by development-server reload. Both pass on rerun.
- The existing full normal-input day passes with satchels: care, training, gathering,
  observation/cues/autonomy, market, nook upgrade/rest, garden, trial, sleep/reload.
  Old starter-checklist assertions now check the resulting authoritative progress.
- Production/carrying journey passes on phone and desktop. The player supplies two
  logs, sees sawing then a full output crate, takes lumber, asks Mallow to carry one,
  walks to the chest, deposits both, and verifies storage across reload.
- Inspected [phone cargo](../evidence/001-m5/phone-cargo.png) and
  [desktop mill](../evidence/001-m5/desktop-mill.png). New station labels show only
  the nearest site to reduce clutter. Foreground vegetation still obscures some
  worksite angles; improve route visibility while integrating M6.

No human fun/balance acceptance or physical-controller test is claimed. No main
merge or Pages deployment is implied by the campaign branch push.

## M6 evidence — 2026-09-28

- Authored collect/deliver steps and persistent per-individual job phases. Two whole
  demonstrations followed by two cued deliveries teach autonomous lumber hauling.
  Picking lumber out of the chest cannot teach the route. Manual cargo removal and
  pausing cannot duplicate delivery credit. The learned helper physically empties
  the mill into the chest while the rancher can work elsewhere in the yard.
- Workers seek the local feed trough when hungry and the nook when tired, then resume.
  Empty troughs/full chests stop work visibly; training and other areas pause it.
  Only the selected companion works. Food, cargo, phase and learning survive reload.
- Save v6 migrates v5 without changing containers, in-flight work or mill progress.
  A frozen v5 fixture protects migration; invalid phases/lessons fail closed.
- 97 unit tests, lint, production Pages build, offline persistence pass. Browser set:
  8 passed, 11 intentional skips, one sidebar overflow repaired; its three-size
  desktop layout rerun passes. Both phone and desktop demonstrate, cue, reload a
  carried board and observe repeated independent deliveries. Desktop additionally
  verifies local food/rest. Responsive smoke passes all four viewports and mocked
  controller command routing passes. No physical-controller/human-balance claim.
- Inspected [phone route](../evidence/001-m6/phone-route.png),
  [desktop deliveries](../evidence/001-m6/desktop-deliveries.png), and worker rest.
  Reduced two foreground trees so the route is visible; kept the fixed dock bay.
- Provisional: learning thresholds 2/6, one-board trips, 4 energy per pickup/deposit,
  meal threshold 70 hunger, autonomous rest reserve 20/resume 50. No offscreen worker
  simulation, general scheduling planner, or new dependency. Stylesheet warning
  remains below its unchanged 20kB error budget.

## M7 evidence — 2026-09-29

- **Garden:** four fixed beds replace `state.crop`; bed 1 keeps the old feed garden's
  place and prepared soil. Growth accrues in game minutes only while a bed is moist.
  Watering lasts until the next 06:00 dawn, so multi-day crops need water each day.
  Morning rain waters every tilled bed. At dawn, crops outside their seasons wither and
  must be cleared. New beds are tilled through the M4 check engine (farming skill, STR,
  END, INT), which earns farming experience.
- **Crops (provisional):** feed greens (spring–autumn, 180 min, unchanged yield),
  crisp turnips (spring/autumn, 1200), grain wheat (spring/summer, 2400), garden
  sunberries (summer/autumn, 1800). The stall sells seeds that show their seasons and
  buys turnips/wheat at 2 coins each. Weeds exist only as overgrown untilled beds;
  there is no weed regrowth.
- **Calendar:** `calendar.ts` derives season, day, and year from `day`. Weather is a
  fixed integer hash per day (day 1 always sunny). It never consumes the save seed, so
  every save shares the same weather. The wall calendar shows today, a 3-day forecast,
  the full year grid, and upcoming facts: season changes, the companion's birthday,
  forecast rain, and harvests the current moisture can actually deliver. Festivals and
  market days are not authored; there is no canon for them yet.
- **Cottage:** a new `cottage` area (door, bed, calendar, hearth, counter); the bed,
  hearth, and counter are solid. Entering or leaving costs 1 game minute. A following
  companion comes inside and exits beside you. A working hauler stays in the yard and
  keeps working; if a cued errand ends while you are inside, it joins you. Exterior
  sleep is kept alongside the bed.
- **Save v7:** migration moves the old crop into bed 1 and keeps the growth already
  promised; watered soil stays moist at least until its old ready time. It adds
  `companionIndoors` and a default farming skill, and widens general containers
  to the new item IDs. v5/v6 validation keeps the legacy item list. A frozen v6
  fixture protects the migration. Plot layout, species, growth bounds, soil-less crops,
  and indoor flags are validated fail-closed.
- **Verification (local, Windows):** 111 unit tests (97 before; new calendar, growth,
  rain, withering, tilling, stall, cottage, hauler-outdoors and v7 migration/corruption
  cases); lint; Prettier; production build at `/` and `/critterstead/` with
  `check:pwa` passing at both. Browser: full suite 57 passed, 23 intentional skips; the 4 failures were the v1-migration assertion expecting exactly 102 growth minutes while the clock ran briefly (102.45). After loosening it, `persistence.spec.ts` passes 36/36 on all viewports. New `household.spec.ts` passes on
  phone and desktop through normal input: buy seed, till, plant, water, enter, read
  the calendar, reload inside, leave, and verify the saved bed.
- **Inspected in the in-app browser:** bed states (overgrown, moist, growing, ready),
  cottage interior at desktop and 375 px, calendar modal at desktop and 375 px (no
  horizontal overflow). Moist/dry soil contrast and per-crop leaf shapes were improved
  after inspection.
- **Known:** the component stylesheet warning rose from 16.48 to 17.29 kB (unchanged
  20 kB error budget). No human fun/balance acceptance is claimed.

## M8 evidence — 2026-09-29

- **Drills:** `drills.ts` holds pure gauge physics. The boulder lift (yard, STR) is a
  force gauge that falls against the weight; hold it in the 55–80% band for 3 s within
  10 s. Higher strength slows the fall. Distance pacing (glade loop, END with some SPD)
  sets pace by tapping. Above the 50–65% steady zone breath drains (END softens this);
  empty breath means winded (pace capped until 30% breath). Score blends lap time and
  breath left. Tests show sprinting winds the runner and scores below a steady pace.
- **Diminishing returns (provisional):** hoops, lift and pace each give 100/55/30/15%
  gains for the 1st/2nd/3rd/4th+ session of a discipline on one game day. The share
  appears on the action label and description before paying, and in the result
  note. Each discipline counts separately and resets the next day. The Clover Cup and
  exhibition are once-a-day events and do not use the curve.
- **Colosseum:** gates now carry destination/arrival data. A gate at the glade's east edge
  leads to the new `colosseum` area (15 min): a skeletal stadium shell with an unfinished
  back arc of stands, scaffold gaps, pennants, a crowd that cheers, and confetti after a
  showing. The exhibition (40/5 energy, 60 min, once a day) is a 3-cue sprint, then a
  heavier stone pull (2.5 s hold). Points = sprint·25 + pull·25 + SPD·2.5 + STR·2.5 +
  care·8 + seeded 0–4. Gold 80 / silver 62 pays 15/9/5 coins. Starter stats with perfect
  play reach about silver; gold needs training.
- **Save v8:** each critter gains `drills` (day and session counts). Training kinds add
  lift/pace/exhibition with gauge fields. Competition entries may carry
  `event: 'exhibition'`, so the Clover Cup's daily limit stays separate. A frozen v7
  fixture protects migration; unknown drills, bad counts, missing gauge fields and
  unknown events fail closed. The M7 in-browser v7 save upgraded to v8 cleanly.
- **UI:** gauge cards show the band, held/lap progress, breath and a "winded" state.
  Companion stats show one decimal so training gains are visible. On phones, touch arrows
  hide during activities (movement is already locked), and the card takes the full
  width: the pacing card had overflowed the frame by 47 px at 375 px wide.
- **Verification (local, Windows):** 119 unit tests; lint; `/critterstead/` production
  build and `check:pwa`. Browser: full suite 31 passed, 25 intentional skips; 32 `persistence.spec.ts` failures were stale save-version assertions (7, received 8). After updating them, `persistence.spec.ts` passes 36/36 on all viewports. New `training.spec.ts` passes on phone
  and desktop: a real-key lift, the 55% label, glade → Colosseum, sprint, pull,
  medal, reload and journal. Inspected lift, sprint and pacing cards, the stadium and
  the glade loop; card placement measured at 375×812 and 844×390.
- **Known:** stylesheet warning 17.28 kB (20 kB error budget). The glade loop and the
  distant crowd are small at phone scale. No human fun/balance acceptance is claimed.

## M9 evidence — 2026-09-30

- **Playtest 1** (product owner's household, on the published M8 build with the visual
  overhaul). Enjoyed: the weather and light, the variety of training, handing items to Pip
  to hold, the tap challenges, and gathering. Wanted better, and the M9 response:
  1. _Too much on screen; unclear where to find stats or an action's result._ One place for
     each ([D37](../../DECISIONS.md#d37--one-place-for-each-kind-of-feedback-touch-steering-implemented-2026-09-30)):
     results appear just above the actions and fade; what changed floats over the rancher
     or companion; stats live only in the details panel (Needs, Abilities, Learning), where
     changed values glow, and the phone chip shows energy, hunger and bond. The area's
     subtitle moved to a title card on arrival; phones fold the brand and area name into
     one row; dock descriptions clamp to three lines on phones.
  2. _Arrows unhelpful; wanted press-and-hold movement on mobile._ Holding a finger (or the
     mouse button) on the world walks toward it; the camera follows, so holding still keeps
     walking; releasing stops, a tap walks to a spot and a pinch cancels. On-screen arrows
     are off by default (Help).
  3. _A drill's start button sat where its tap button had been._ The result now replaces
     the drill's card for 2.8 s and holds all action input (tap, Space/E, controller A). It
     cannot be dismissed early, since a dismissal would let the next tap through. This
     supersedes the visual overhaul's 0.7 s keyboard-only guard.
- **Multi-day loop:** `campaign.spec.ts` plays a fresh household for three days through
  ordinary commands, reloading from the saved record every night: care, planting, tilling
  and watering, hoops, watched gathering, selling, seeds, timber, the sawmill, the lift and
  rest; a harvest, hauling lessons, the Colosseum exhibition and pacing; turnips to market,
  the calendar, feeding and stocking the trough, foraging and hauling cues to
  independence, and the Clover Cup. It ends with one continuous Mallow, three days older
  and stronger in every trained stat. `e2e/campaign.spec.ts` plays three days on desktop
  with normal controls: results above the dock, a drill result ignoring taps where its
  button was, next-day drill reset, a harvest, hold-to-move, and a reload on day three.
- **Integration finding:** a hungry hauler cued to work goes to the feed trough first and,
  if it is empty, waits there ("Already helping") until fed. Only the hauling status said
  so; the host now also notes it once in the journal, so it appears above the actions.
  The waiting itself is unchanged (designed in M6).
- **Saves:** every frozen fixture v1–v7 migrates to v8 keeping the world, clock, coins,
  journal, each companion's identity, age, stats, competitions and history, and the active
  selection; a second read changes nothing, and the result plays and saves cleanly.
- **Verification:** 129 unit tests; lint, formatting, `/critterstead/` build (1.06 MB
  initial) and `check:pwa`.
  Browser suite: 64 passed, 28 project-scoped skips, 0 failed (17.0 min). The heaviest
  journeys also pass with frames throttled to ~6.5 fps to emulate CI. GPU screenshots inspected at 390×844 and 1440×900 (drill result,
  floats, sections, returning dock). No physical-device test is claimed.
- **Gate recommendation:** the slice is save-safe, spans days with real choices and
  delegation, and is more legible after playtest 1. Automated checks cannot prove fun:
  the gate needs the product owner's playtest of this build (protocol in
  [DEVELOPMENT.md](../../DEVELOPMENT.md#human-playtest-protocol)) and the planned vision
  sessions, which will shape Stage 2. Stage 2 has not begun.

## Playtest 2 follow-up — 2026-10-01

Second session with the same tester on the M9 build, answering the protocol's questions.

- **Care** — _meaningful, but could be better: idle animations, reactions when fed or
  petted._ The companion now fidgets when idle (looks around, stretches, sniffs, hops),
  yawns when tired and begs when hungry, and reacts to a scritch (eyes closed, leaning
  in, the rancher's hand out), a meal (bites, then a hop), a drill's result and a new
  lesson. Reactions are requested by the action itself, not by journal wording.
- **Learning** — _"I didn't notice a difference based on the critter level; not sure what
  was earned."_ Growth already changed foraging but nothing showed it; hauling practice
  changed nothing. Now ([D38](../../DECISIONS.md#d38--quests-read-from-the-save-growth-is-visible-and-counts-implemented-2026-10-01)):
  hauling pace rises with speed and practice; a Learning tab shows each lesson's stage,
  progress and a plain "what this earns" line, plus practice levels; reaching a stage
  shows a banner; practice gains and work the companion does alone float over it.
- **Logistics** — _liked the cycle, especially milling; menus will need rework as items
  grow._ Storage moves are grouped into one row per item (counts for you and the place,
  compact Store/Take/companion moves) instead of one long button per move. The host's
  action ids and labels are unchanged.
- **Days** — _"yes, the farm life never ends."_ No change.
- **Clarity** — _stats and results clear; "the quest log is buried"; wants a journal for
  history and quests._ The journal opens on Quests ("Today" and "Your journey", derived
  from the save), with History grouped by day and Supplies as tabs; when nothing is
  nearby the HUD names the journey's next step.
- **Controls** — _drop the on-screen arrows; touch to move is enough._ Removed, with their
  Help toggle.
- **Verification:** 135 unit tests; lint, formatting, `/critterstead/` build (1.08 MB
  initial, nearing the 1.1 MB warning budget) and `check:pwa`. Browser suite: 64 passed, 28 project-scoped skips, 0 failed; the heavy
  journeys also pass with frames throttled to ~6.5 fps. That run exposed the result note
  overlapping the dock for a moment after load (its position used a height measured only
  every 0.2 s); the HUD now re-measures whenever the bottom panel or the note changes.
  GPU screenshots inspected at 390×844, 844×390, 1280×800 and 1440×900 (storage rows,
  Learning tab, milestone banner, journal quests, petting reaction).
- **Still open for the gate:** feedback from other testers and the product owner's vision
  sessions. Stage 2 has not begun.
