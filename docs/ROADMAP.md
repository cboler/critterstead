# Playable development roadmap

Canonical roadmap for Critterstead. This document defines the sequenced path from
the current prototype to the full intended game.

- The roadmap is a sequenced strategy, not a flat, unreviewed backlog.
- Each milestone must produce an observable gameplay difference in ordinary play
  ([D18](DECISIONS.md#d18--player-visible-milestone-rule-after-foundation)).
- Milestones build shared abstractions before depending on them, avoiding expensive
  untested speculative frameworks.

For full game design, see [GAME-DESIGN.md](GAME-DESIGN.md).
For engineering reality and boundaries, see [ARCHITECTURE.md](ARCHITECTURE.md).
For active milestone execution, see [exec-plans/README.md](exec-plans/README.md).

---

## High-level stage progression

```
[Stage 0: Bootstrap] -> [Stage 1: First Living Stead] -> [Stage 2: Household & Opening]
       Complete                 Complete                  Campaign 003; M4-M5 await story
                                     |
                                     v
                  [Training & Exhibitions] -> [Colosseum Ladder]
                   Active Campaign 004          Next campaign
                                     |
                                     v
                        [Stage 3: Community & Expansion]
                                  Planned
                                     |
                                     v
                        [Stage 4: Lineages & Chimeras]
                                  Planned
                                     |
                                     v
                        [Stage 5: The Enduring Stead]
                                  Planned
```

| Stage                           | Focus & Playable Outcome                                                                                                                                                            | Key Deliverables                                                                                                                                                          |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0 — Repository memory**       | Shared truth, architecture boundaries, recoverable plans                                                                                                                            | [Completed bootstrap record](exec-plans/completed/000-repository-memory-bootstrap.md)                                                                                     |
| **1 — The First Living Stead**  | Multi-system vertical slice with one critter: rancher stats, checks, physical logistics, production, multi-crop farming, cottage interior, calendar, and diverse training minigames | Campaign 001 (M1–M9) complete; save v8; gate closed 2026-10-02                                                                                                            |
| **2 — Household and opening**   | Guided childhood prologue centered on Grandpa: the walk to town with Pip, meeting Gemothy, starter acquisition, spring-and-summer years, Grandpa's passing, first winter alone      | Oakhaven reachable; Pip and Gemothy; primary-family archetypes for a 3-family starter offer ([D40](DECISIONS.md#d40--opening-walk-and-starter-offer-accepted-2026-10-02)) |
| **3 — Community and expansion** | Expanded stead, 3-critter active party, town shops, cooking/baking appliances, requests, theatrical Colosseum tournaments                                                           | Roster & barn expansion; town commerce; turn-based combat                                                                                                                 |
| **4 — Lineages and chimeras**   | Husbrandry, natural breeding, artificial growth technology, authored family spectra, stable lineages                                                                                | Chimera generation; pedigree history; trait inheritance                                                                                                                   |
| **5 — The Enduring Stead**      | Multi-year generational play, seasons, aging, respectful mortality, Pip's legacy passed to youth                                                                                    | Long-term life simulation; memorials; legacy transmission                                                                                                                 |

---

## Campaign 001 — The First Living Stead (complete)

Campaign 001 replaces the early underspecified M4–M6 runway with a comprehensive,
staged progression (M1 through M9) that systematically builds the foundational vertical slice.

### Milestone status and runway

```
[M1: Identity & Ownership] (Complete - 2026-09-26)
  |
[M2: Generalized Learning] (Complete - 2026-09-26)
  |
[M3: Daily Choice & Rest] (Complete - 2026-09-27)
  |
[M4: Rancher Stats & Checks] (Complete - 5290082)
  |
[M5: Localized Storage & Production] (Complete - save v5)
  |
[M6: Compositional Jobs & Hauling] (Complete - save v6)
  |
[M7: Multi-Crop Farming & Calendar] (Complete - save v7)
  |
[M8: Diverse Training & Colosseum] (Complete - save v8)
  |
[M9: Vertical Slice Gate] (Complete - gate closed 2026-10-02)
```

#### M1 — Establish distinct critter identity and ownership (Complete)

- **Delivered**: `GameState.critters` array, explicit `ownerId`, `activeCritterId` selection,
  provisional starter Mallow, save schema v2 with 100% legacy migration fidelity.
- **Evidence**: Commit `122a6ea` / `346b232` on `origin/main`.

#### M2 — Generalize learning while retaining the berry experience (Complete)

- **Delivered**: Authored `BEHAVIORS` definition table, per-individual `learnedBehaviors`
  progress map, save schema v3 with chained migration.
- **Evidence**: Commit `6b7cf49` on `origin/main`.

#### M3 — Make care, effort, and recovery produce a daily choice (Complete)

- **Delivered**: Daytime **Rest together** action at the companion's nook (120 game minutes,
  restoring up to 30 player / 35 critter stamina), retuned activity energy costs, and a
  compact bottom interaction dock replacing the obscuring card.
- **Evidence**: Commit `c15cb30` / `d9ba9d7` merged via PR #1 into `main`. Human playtest
  evaluation on 2026-09-27 confirmed that while Rest together functions smoothly, it did not
  create a materially different or choice-driven loop by itself; this finding validates
  moving forward into the broader M4–M9 multi-system runway rather than reopening M3.

#### M4 — Rancher stats, generalized checks, and physical encumbrance (Complete)

- **Delivered**: `5290082` on `codex/first-living-stead`; save v4. See campaign evidence.
- **Player-visible change**:
  1. Give the rancher the same 4-stat system (STR, END, SPD, INT) and primary skills
     (Woodcutting, Mining, Hauling, Foraging).
  2. Introduce the pure host check resolution engine (`Skill + f(Stats) + Tool vs Difficulty`).
  3. Add new physical resource nodes in the world: fallen timber (chopped with axe for logs)
     and quarry boulders (broken with pick for stone slabs).
  4. Implement graduated physical encumbrance: carrying heavy timber or stone slows movement
     and increases stamina drain.
  5. Decouple the Three.js viewport canvas from the bottom interaction dock to ensure layout
     stability ([D32](DECISIONS.md#d32--viewport-decoupling-from-interaction-dock-ui)).
  6. Organic progression: performing checks awards visible experience to relevant stats and skills.

#### M5 — Localized storage, physical carrying, and first production chain

- **Player-visible change**:
  1. Eliminate the magical global inventory: implement localized `Container` entities
     (player backpack, critter satchel, wooden yard chest, station hoppers).
  2. Implement physical carrying: player and critters pick up, hold, and deposit physical
     cargo into nearby containers.
  3. Introduce the first refining workstation: **Woodchopping Block / Sawmill** in the yard
     (converts chopped logs into refined lumber).
  4. Emergent failure chains: the workstation halts when the input hopper runs out of logs
     or the output crate is full.

#### M6 — Compositional learning and first autonomous job (Hauling)

- **Player-visible change**:
  1. Generalize the learning cycle to multi-step tasks: observing hauling $\rightarrow$ cued
     carrying $\rightarrow$ independent opportunity recognition.
  2. The companion learns to inspect the sawmill output, pick up refined lumber, carry it
     across the yard, and deposit it into the storage chest.
  3. Basic critter self-management: when hungry, the companion seeks food from the feed trough;
     when exhausted, it rests at the nook before resuming work.
  4. A tangible reduction in player daily chores through successful delegation.

#### M7 — Multi-crop farming, cottage interior, and household calendar (Complete)

- **Delivered**: save v7; see campaign evidence for the implemented scope (weeds are
  limited to untilled beds; festivals and market days are not yet authored).

- **Player-visible change**:
  1. Expand the single feed crop into a 4-plot tilled garden grid supporting seasonal crops
     (sunberries, crisp turnips, grain wheat).
  2. Implement soil moisture, daily watering, weed management, and growth stages.
  3. Unlock the cottage interior door: transition into the cozy cottage diorama.
  4. Cottage interior features an **inspectable wall calendar** tracking the 120-day year
     (4 seasons $\times$ 30 days), upcoming festivals, and market days.

#### M8 — Diverse training disciplines and Colosseum exhibition (Complete)

- **Delivered**: save v8; boulder lift (yard), distance pacing (glade), same-day
  diminishing returns, and the Colosseum exhibition reached through the glade.

- **Player-visible change**:
  1. Expand training beyond rhythm hoops by introducing two activity-matched minigames:
     - **Weight Lifting / Boulder Push** (STR: rhythmic force gauge against visible mass).
     - **Distance Pacing / Sprint Relay** (END/SPD: sustained pacing challenge).
  2. Daily diminishing returns: repeatedly training the same discipline incurs fatigue,
     rewarding balanced routines.
  3. Open the path to the Colosseum gate: enter the skeletal stadium shell and enter a
     multi-stat athletic exhibition trial with audience fanfare.

#### M9 — Vertical slice integration, multi-day playtesting, and campaign gate (Complete)

- **Delivered**: a three-day household exercised end to end (rules and browser), every save
  version v1–v7 migrating intact to v8, the playtest protocol, and fixes from the first
  human playtest (clear feedback placement, touch steering, no accidental drill restarts).
  See [campaign evidence](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m9-evidence--2026-09-30).
- **Gate**: closed by the product owner on 2026-10-02 after two playtests and the first
  vision session ([D43](DECISIONS.md#d43--stage-2-begins-accepted-2026-10-02)).
- **Player-visible change**:
  1. A cohesive, multi-day experience demonstrating the complete living stead: farming,
     resource gathering, physical hauling, refining lumber, training across varied disciplines,
     resting together, delegating autonomous chores, and competing in exhibitions.
  2. Comprehensive regression verification: full-day automated Playwright runs, PWA offline
     reloads, and verified save migration from every earlier version.
  3. Structured human playtest evaluating attachment, pacing, and daily engagement as the
     formal gate before beginning Stage 2.

---

## Campaign 004 — Training and exhibitions (completed 2026-10-04)

Brought ahead of plan 003's M4–M5 and Stage 3 by [D47](DECISIONS.md#d47--raise-critters-for-the-colosseum-accepted-2026-10-03):
two real-time drills per stat, each also a menu routine, then scheduled Colosseum events
([plan 004](exec-plans/completed/004-training-and-exhibitions.md)). The Colosseum ladder
(ranks, promotion cups, a balancing simulator) is the next campaign, pulled forward from
Stage 3's tournaments.

## Campaign 003 — Household and Opening

Stage 2, sequenced in [plan 003](exec-plans/active/003-household-and-opening.md):

1. **M1** — the nine families and a choice of starter (save v9). Complete.
2. **M2** — Grandpa, Pip and the road to Oakhaven (save v10). Complete.
3. **M3** — the walk to town: the scripted opening and the starter offer in Oakhaven. Complete.
4. **M4** — the years with Grandpa (needs story beats).
5. **M5** — Grandpa's passing and the first winter (needs story beats).

---

## System implementation matrix

This matrix provides a clear operational index distinguishing what is implemented today,
what is developed in the active campaign, and what is deferred to future stages:

| System                    | Currently Implemented                      | Active Campaign 001 (First Slice)                                    | Deferred to Future Stages                                 |
| :------------------------ | :----------------------------------------- | :------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Rancher Stats**         | None (only stamina & coins)                | Unified 4-stat system (STR, END, SPD, INT) and skills (M4)           | Advanced skill mastery perks, apparel stat bonuses        |
| **Critter Roster**        | 1 active companion (Mallow); dormant array | 1 active companion + mentoring Pip fixture                           | 3-companion party, barn stalls, roster management UI      |
| **Simulation Checks**     | Ad-hoc threshold checks                    | Extensible pure check engine with failure degrees (M4)               | Catastrophic cascading disaster events (fire, collapses)  |
| **Inventory & Logistics** | Flat global array (`inventory`)            | Localized containers, carrying, hauling, failure chains (M5, M6)     | Carts, draft harnesses, complex storage filter priorities |
| **Farming**               | 1 plot, 1 feed crop                        | 4-plot garden grid, 3 seasonal crops, soil moisture (M7)             | 50+ crop catalog, giant vegetables, fertilizer synthesis  |
| **Production**            | 1 cosmetic shed upgrade                    | Chopping block/sawmill (logs $\rightarrow$ lumber) (M5)              | Metallurgy (smelting, smithing), kitchen baking, brewing  |
| **Training**              | Rhythm hoops only                          | Hoops + Weight Lifting + Pacing minigames + diminishing returns (M8) | 10+ minigames, sparring arena, medicinal recovery tonics  |
| **Calendar & Time**       | 24-hr clock, infinite day counter          | 4 seasons $\times$ 30 days = 120 days, cottage wall calendar (M7)    | Multi-year timeskips, seasonal festivals, birthdays       |
| **World Spaces**          | Bramblewick Yard, Clover Glade             | Yard, Glade, Cottage Interior, Colosseum Grounds (M7, M8)            | Oakhaven Town, Whispering Woods, Quarry Mine, Dungeons    |
| **Town & Economy**        | Honesty stall (instant coin sell)          | Honesty stall + localized pricing preparation                        | Inhabited Oakhaven, scheduled NPCs, shops, contracts      |
| **Competition & Combat**  | Clover Cup time trial                      | Clover Cup + Colosseum athletic exhibition (M8)                      | Turn-based theatrical combat, real-time dungeon battles   |
| **Breeding & Genetics**   | Placeholder parentIds/genetics             | Preserved data structures                                            | Artificial growth technology, 9-family chimeras           |
