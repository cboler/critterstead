# Architecture and implemented baseline

This document is the engineering authority for Critterstead. It records the software
architecture, boundaries, current code reality, narrow abstractions, and architectural
foundations needed for upcoming systems.

For product and design intent, see [GAME-DESIGN.md](GAME-DESIGN.md).
For historical context and settled rationale, see [DECISIONS.md](DECISIONS.md).
For sequencing and active implementation plans, see [ROADMAP.md](ROADMAP.md) and
[exec-plans/README.md](exec-plans/README.md).

---

## Boundaries and invariants

The codebase enforces strict separation of concerns between simulation, presentation,
and persistence:

| Component                                        | Owns                                                                                                              | Must not own                                                          |
| :----------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **[model.ts](../src/app/game/model.ts)**         | State definitions, commands, persistent identifiers, entity schemas, save types                                   | Presentation, Three.js objects, browser storage APIs                  |
| **[content.ts](../src/app/game/content.ts)**     | Authored areas, world objects, static tables, behavior stages, species definitions                                | Per-frame simulation, state mutation, rendering                       |
| **[host.ts](../src/app/game/host.ts)**           | Authoritative local simulation, command validation, clock/time, movement, collision, rewards, seeded random draws | Angular signals, DOM events, Three.js rendering, IndexedDB operations |
| **[storage.ts](../src/app/game/storage.ts)**     | Save serialization, schema validation, explicit legacy migrations, IndexedDB driver                               | Game progression rules, entity logic, UI state                        |
| **[app.ts](../src/app/app.ts), template/styles** | UI views, menus, HUD, input routing, audio cues, host lifecycle, Web Locks tab ownership                          | Direct mutation of authoritative state or game logic                  |
| **[world.ts](../src/app/game/world.ts)**         | Three.js scene graph, procedural meshes, camera controls, particle effects, ground-click raycasting               | Authoritative state mutation, economy calculations, validation        |
| **[render/](../src/app/game/render)** (world.ts) | Surroundings, atmosphere (light/weather), wind, post-processing, quality tiers, palettes                          | Game state, rules, saves; they only read the snapshot world.ts passes |

### Invariant principles

1. **Local authoritative host**: `LocalGameHost` maintains the single source of truth for
   simulation state. Commands are dispatched into the host, validated, and processed deterministically.
   Angular UI components read cloned snapshots via signals; Three.js renders state each animation frame.
2. **Deterministic seeded outcomes**: Core random determinations (harvest yields, practice
   target positions, contest timings) derive strictly from a persisted linear congruential
   PRNG (`state.seed`). Gameplay must never consume `Math.random()` or wall-clock timestamps.
3. **Persistent individual identity**: Critters have permanent, unique IDs. Array order has
   zero selection semantics. Actions apply specifically to designated individual entities.
4. **Fail-closed save protection**: If a save fails validation or explicit migration, the
   existing record in IndexedDB remains intact; the game never silently resets player progress.
5. **Platform independence**: Game logic runs purely in TypeScript without depending on Node.js,
   cloud backends, or third-party service workers.

---

## Current implementation additions — M4 (2026-09-27)

Save v4 adds shared actor capabilities to the rancher, physical timber/stone sites,
paid in-flight resource work, and persistent ground cargo. Pure checks in
`checks.ts` return degree, damage, time, animation duration, stamina price, and
fractional skill/stat gains. Starter axe/pick quality is fixed; advanced quality
scales with proficiency in the resolver, but no tool tiers or maintenance are shipped.
The four load bands affect movement and energy per distance. Zero-energy heavy
walking remains possible; severe overload is recoverable by setting cargo down.
M5 replaces the former carried inventory with localized containers (see below).

The viewport and dock occupy independent absolute layers, with a fixed 180px dock
bay that stays reserved even when no interaction is present. Dock overflow scrolls
inside that bay; opening/cycling targets cannot resize the camera. The rancher card
shows stats, skills, weight, and held materials; original meshes show work and cargo.

Migration v3 -> v4 preserves all existing fields, seeds, individuals, and paid
training, adds explicit rancher defaults and sites, and rejects conflicting new
fields. Frozen v1/v2/v3 fixtures protect legacy continuity.

## Current implementation additions — M5 (2026-09-28)

Save v5 replaces global inventory with localized containers: the rancher backpack,
a separate ID-bound satchel for every saved critter, wooden yard chest, feed trough,
and sawmill input/output buffers. Ground cargo remains persistent at its actual
area/position. Migration preserves every former stack ID, quantity and quality,
all critters, paid work/training, ground piles, seed and existing progress.

`logistics.ts` owns container definitions, item-conserving transfers, capacities,
and production constants. The host checks both actors' proximity before a transfer.
Player actions consume backpack supplies only. Companion berries enter its satchel;
the stall can sell them only while that companion is physically nearby. Dormant
individuals' satchels are inaccessible through active-companion commands.

The fixed yard sawmill consumes one delivered timber to produce two lumber per
12 game minutes. Input is consumed atomically with output. Empty input or full
output stops production; stopped time cannot accumulate into future free work.
Partial work survives reload. Meshes show buffers, machine operation and carried
cargo. Nearby actions explain stoppages and storage contents. Container transfers
use the existing keyboard/touch/controller path. The optional journal lists supplies
by location without allowing remote use. M6 learning/autonomous hauling is next.

## Current implementation additions — M6 (2026-09-28)

Save v6 adds a persistent collect/deliver/eat/rest job to each individual and a
whole-route observation ledger. Behavior content authors steps and learning stages;
the host executes the narrow lumber route through the same atomic container rules.
Needs redirect the active worker to local feed or the nook. Other areas and training
pause work; disabled jobs follow the rancher. Cargo stays in the actual satchel across
reload or pause. Dormant individuals remain dormant. Migration v5 -> v6 preserves
all paid work, production and supplies; validators reject impossible job phases.

## Current implementation additions — M7 (2026-09-29)

Save v7 replaces `crop` with four fixed `plots` (`garden.ts`) and adds `companionIndoors`
and the `cottage` area. `calendar.ts` derives the 4 × 30-day year from `day` and fixed
per-day weather from an integer hash that never touches `state.seed`. The host advances
beds in `advanceMinutes`: growth accrues only while `moistUntil` is in the future, and
each 06:00 dawn applies rain and out-of-season withering. Crop species live in
`content.ts`. Tilling uses `resolveCheck`. While the rancher is indoors, a working
companion stays at its yard position and the host keeps running its hauling job;
a following companion enters with the rancher. Migration v6 → v7 keeps the old crop's
promised growth in bed 1. v5/v6 containers validate against the legacy item list.

## Current implementation additions — M8 (2026-09-29)

Save v8 adds per-critter `drills` (same-day session counts) and the `colosseum` area.
`Training` covers hoops, race, lift, pace and exhibition; gauge kinds carry
`meter/progress/reserve/stage`. Their fixed-step physics live in `drills.ts` and
advance in `update`, finishing via `finishTraining`. `WorldObject` gates declare
`destination` and `arrival`, so travel is data-driven. Exhibition results are
competition entries tagged `event: 'exhibition'`; only the final score draws from the seed.

## Current implementation additions — presentation (2026-09-30)

The canvas is full-screen; HUD panels float over it and `app.ts` reports the covered
edges each 200 ms (`setInsets`), so the orthographic follow camera frames the rancher in
the uncovered area. The camera keeps one fixed viewing direction (screen-relative inputs
stay valid) and only moves and zooms. `render/terrain.ts` builds non-walkable scenery past
the playable square and never places tall scenery where it would hide playable ground;
its instances are grouped into 12-unit tiles so camera and shadow culling skip what is
out of view. `render/atmosphere.ts` drives light from `state.minute` and
`weatherFor(day)`; `render/post.ts` adds tilt-shift, night bloom and grading.
`render/quality.ts` picks a tier from the WebGL renderer (software renderers such as
headless SwiftShader get `light`: no post-processing or sun shadows, less detail, half
resolution); players can override it in Help. Fog starts beyond the camera's 60-unit
focus distance. None of this reads or writes save data.

Feedback (M9, [D37](DECISIONS.md#d37--one-place-for-each-kind-of-feedback-touch-steering-implemented-2026-09-30)):
`app.ts` snapshots visible state before each command and when a drill or work begins,
then compares it afterward; differences float over the rancher or companion
(`GameWorld.float`) and mark changed stats in the HUD. When a drill ends, a result card
replaces its card and holds action input for a few seconds. `GameWorld` steers toward a
held pointer every frame through its walk callback (`null` stops), so a fixed finger keeps
walking as the camera follows. All of this is presentation over host state.

## Architectural reality audit (reconciliation baseline before M4)

The following audit records the reconciled pre-M4 baseline. The dated additions
above supersede its rancher, check, encumbrance, resource, viewport, and save rows.

To avoid implementation confusion, the codebase is audited across four distinct categories:

1. **Currently implemented**: functional, tested code running in the current build.
2. **Narrow abstractions**: data structures or hooks that exist but cover only one narrow case.
3. **Intended game design (unimplemented)**: designs described in [GAME-DESIGN.md](GAME-DESIGN.md)
   that have no code representation yet.
4. **Architectural generalizations needed**: foundational refactoring required before future
   gameplay systems can be cleanly implemented.

```
+-----------------------------------------------------------------------------------+
| 1. Currently Implemented (M1 + M2 + M3 complete)                                  |
|    - GameState v3, LocalGameHost, IndexedDB save migration (v1->v2->v3)           |
|    - Single active companion (Mallow starter), Brindlekin procedural mesh         |
|    - Bramblewick Yard & Clover Glade, single crop plot, 6 berry bushes            |
|    - 1 behavior (sunberry-foraging), timing hoops practice, Clover Cup trial      |
|    - Daytime "Rest together" at companion nook, retuned energy, compact dock UI   |
+-----------------------------------------------------------------------------------+
| 2. Narrow Abstractions (Existing but constrained)                                 |
|    - `Critter.stats`: 4 stats exist on critter, but player only has stamina/coins |
|    - `Critter.skills`: hardcoded { harvesting, racing }                           |
|    - `InventoryItem`: hardcoded 'berry' | 'feed' | 'seed'                         |
|    - `ResourceNode`: berry bushes only                                            |
|    - `Crop`: single hardcoded crop object                                         |
|    - `GameState.critters`: array exists, but non-active critters remain dormant   |
|    - Interaction dock: flow sibling below viewport causing canvas resizes         |
+-----------------------------------------------------------------------------------+
| 3. Intended Game Design (Unimplemented)                                           |
|    - Physical localized storage, hauling routes, production chains (logs, flour)  |
|    - Player stats & skills, tool degradation, multi-crop farming, seasons/weather |
|    - House interior, town of Oakhaven, shops, NPC schedules, Colosseum events     |
|    - Monster Rancher-style training minigames, turn-based combat, adventuring     |
+-----------------------------------------------------------------------------------+
| 4. Architecture Needed Next (Pre-requisites for expansion)                        |
|    - Viewport decoupling (dock height changes must not resize 3D canvas)          |
|    - Unified Actor capability model (player & critter stats/skills)               |
|    - Extensible Check & Resolution engine                                         |
|    - Localized Container & Item model (eliminating global inventory)              |
|    - Compositional Task & Job scheduling pipeline                                 |
+-----------------------------------------------------------------------------------+
```

### Detailed audit matrix

| Subsystem                | What is currently implemented                                                                    | Narrow abstraction limit                                                      | Intended design (unimplemented)                                                              | Architecture generalization needed                                                                          |
| :----------------------- | :----------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Rancher / Player**     | Position, single stamina pool, coin counter, input routing                                       | Player lacks STR, END, SPD, INT stats; lacks learned skill proficiencies      | Rancher has 4 stats and full skill taxonomy; levels up via organic use                       | **Unified Actor Model**: Abstract common capability interface shared by player and critters.                |
| **Critters & Roster**    | Stable ID, ownerId, ageDays, health, hunger, stamina, happiness, bond, activeCritterId selection | Only 1 critter simulated at a time; others in `critters` array remain dormant | 3 active party companions; housed barn roster; Grandpa's Pip as mentor                       | **Party & Roster Manager**: Distinguish active party, working stead hands, and housed animals.              |
| **Stats & Growth**       | 4 stats on Critter (STR, END, SPD, INT); raw numbers                                             | Hardcoded 1-50 starting values; no stat growth formulas or checks             | Stats range 1–999; slow organic growth through use and dedicated training                    | **Stat & Growth Pipeline**: Hooks connecting action checks and training outcomes to slow stat XP.           |
| **Skills**               | `Critter.skills: { harvesting: number, racing: number }`                                         | Fixed two-field object; no skill XP progression or tool requirements          | Skills range 1–99 across mining, woodcutting, farming, cooking, smithing, etc.               | **Extensible Skill Registry**: Key-value skill map with XP curves, shared between player and critters.      |
| **Simulation Checks**    | Ad-hoc threshold checks (e.g. `harvesting >= 2` for double berries)                              | Hardcoded if-statements scattered in host methods                             | Extensible formula: `Skill + f(Stats) + Tool + Modifiers vs Difficulty` with failure degrees | **Check & Resolution Engine**: Pure host function returning success degrees, costs, and side effects.       |
| **Learning & Jobs**      | Authored `BEHAVIORS` table with stages; numeric progress map                                     | Only `sunberry-foraging` defined; single hardcoded harvest execution in host  | Multi-step compositional jobs (e.g. Garden Duty); critters observing and teaching            | **Compositional Task System**: Task definitions built from atomic sub-actions (locate, carry, apply).       |
| **Inventory & Items**    | Flat `state.inventory: InventoryItem[]` array                                                    | Only `itemId: 'berry' \| 'feed' \| 'seed'`; global bag abstraction            | Physical localized storage (chests, fridge, troughs, hoppers); no magical global bag         | **Localized Container Architecture**: Container component on entities; physical item routing.               |
| **Physical Logistics**   | None                                                                                             | No carrying objects, no hauling, no encumbrance                               | Physical hauling routes; graduated encumbrance slowing movement; failure chains              | **Physical Item & Encumbrance System**: Held items, mass/weight calculations, drop/pickup logic.            |
| **Care & Recovery**      | Rest together at nook (120 min, +30 player / +35 critter energy); retuned costs                  | Nook recovery is fixed; no consumables, doctor, or fatigue scaling            | Grooming, nutritional feeds, veterinarian, pasture retirement                                | **Health & Fatigue Pipeline**: Expand beyond stamina into medical/wellbeing systems.                        |
| **Farming**              | Single `state.crop: Crop` (plantedAt, watered, readyAt)                                          | Exactly one plot at fixed coordinates; single feed crop                       | Tilled soil grid, multi-crop catalog, fertilizer, quality grades, weeds, pests               | **Spatial Soil Grid & Crop Engine**: Plot-based or grid-based multi-crop state machine.                     |
| **Production & Tools**   | One shed upgrade (visual mesh change + happiness bonus)                                          | Flat shed level counter; zero production machines or tool items               | Multi-tiered refining (logs->lumber, wheat->flour); tool wear, sharpening, breakage          | **Workstation & Tool Pipeline**: Workstation entity with input/output inventories, recipes, and tool slots. |
| **World & Navigation**   | Bramblewick Yard & Clover Glade; 6 berry bushes; gates                                           | Fixed 2D bounding boxes; 2 hardcoded areas; no pathfinding                    | Multi-area world (cottage, town, quarry, mine, Colosseum, forest); path obstacles            | **Multi-Area World Manager**: Area streaming, path transition triggers, and navigation graphs.              |
| **Viewport & UI**        | Angular diorama container; Three.js renderer; compact dock                                       | Dock is a flow sibling below canvas; target changes resize 3D viewport        | Stable viewport canvas that never resizes when dock opens/closes                             | **Decoupled Viewport Layout**: Canvas fixed in viewport layer; overlay docks float independently.           |
| **Training & Minigames** | Single rhythm hoops minigame; Clover Cup time trial                                              | Hardcoded timing bar logic inside host state machine                          | Family of minigames (lifting, running, SIMON, command drills) matching metaphors             | **Extensible Minigame Framework**: Pluggable minigame interfaces with distinct input and check hooks.       |
| **Calendar & Time**      | 24-hr clock (~30 min real-time); day counter; sleep advances                                     | Day counter increments infinitely; no months, seasons, or weather             | 4 seasons x 30 days = 120 days/year; festivals, deadlines, inspectable calendar              | **Calendar & Season System**: Season state machine, annual event schedules, and weather flags.              |
| **Town & Economy**       | Honesty stall (instant sale of berries for coins)                                                | Single sell action; infinite instant demand                                   | Full town of Oakhaven; shops, resident schedules, appliance purchases, contracts             | **Town & Commerce Engine**: Merchant inventory catalogs, price variation, and contract boards.              |
| **Combat & Arenas**      | Clover Cup time trial (3 timing hits against clock)                                              | Single-participant time trial                                                 | Dangerous real-time adventuring vs nonlethal theatrical turn-based Colosseum                 | **Dual Combat Engines**: Distinct real-time adventure loop vs turn-based Colosseum engine.                  |

---

## What exists today in the codebase

### State model at the reconciliation baseline (`model.ts`)

- **Save schema version**: `3`.
- **`GameState`**: owns `seed`, `day`, `minute`, `totalMinutes`, `areaId`, `areaInstanceId`,
  `player`, `critters`, `activeCritterId`, `inventory`, `resources`, `crop`, `shedLevel`,
  `flags`, `journal`, and `training`.
- **`Critter`**: holds `id`, `ownerId`, `lastPettedDay`, `name`, `speciesId`, `ageDays`,
  `sex`, `personality`, `position`, `stats` (STR, END, SPD, INT), `stamina`, `health`,
  `happiness`, `bond`, `hunger`, `learnedBehaviors`, `skills` (harvesting, racing),
  `visualTraits`, `pedigree`, `genetics`, `history`, and `competitions`.
- **`Player`**: currently limited to `{ id, position, stamina, coins }`.
- **`activeCritter(state)` helper**: resolves the currently selected companion by ID and
  verifies player ownership. (Requiring player ownership is a temporary Stage-1 implementation
  limitation, not permanent game canon).

### Simulation host (`host.ts`)

- Local authoritative state machine running on variable tick intervals (`update(seconds)`).
- Time advances continuously (1 real second $\approx$ 48 game seconds) and via action
  increments (e.g., harvesting takes 10–15 game minutes).
- Explicit movement vector handling with circle/box collision against world obstacles.
- Command validation for petting, feeding, harvesting berries, planting/watering crops,
  training hoops, time trials, **Rest together** at the nook, and sleeping.
- Deterministic seeded random numbers via linear congruential generator:
  $$\text{seed} = (\text{seed} \times 1664525 + 1013904223) \pmod{2^{32}}$$

### Care, effort, recovery, and the interaction dock (Implemented in M3)

- **Rest together** at the companion's nook spends 120 game minutes and restores up to
  30 player / 35 selected-companion energy, capped at 100. It requires no energy,
  inventory, coins, or nook upgrade. Rest increases hunger by 3 through the existing
  clock, grows crops and regrows berries; it does not reset daily petting/trial limits,
  improve happiness/bond/skills, consume randomness, or replace overnight sleep.
- M3 effort prices are 30 companion / 5 player energy for practice (40 game minutes),
  35 / 5 for the trial (45 minutes), and 12 / 2 for a cued harvest (20 minutes).
  Self-gathering remains 6 player energy / 15 minutes.
- The compact interaction dock is a flow sibling below the world view. Target, status,
  costs, actions, and disabled reasons stay visible without obscuring the characters.
  Because the dock is currently a flow sibling, opening and closing interactions shifts
  the viewport height—this motivates the **viewport decoupling** prioritized for M4.

### Content & area definitions (`content.ts`)

- Areas: `homestead` (Bramblewick Yard, halfSize 10) and `glade` (Clover Glade, halfSize 10).
- World objects: cottage, shed (nook), feed garden crop, training hoops, honesty stall,
  glade gate, and Clover Cup time trial marker.
- Renewable berry bushes: 6 nodes in Clover Glade with 180-minute respawn timer.
- Behaviors: `sunberry-foraging` with 4 stages (unfamiliar, observing, cued, autonomous).

### Persistence & migration (`storage.ts`)

- IndexedDB database `critterstead`, store `saves`, key `homestead`.
- Strict migration pipeline:
  - **v1**: Single `critter` object with legacy berry fields.
  - **v2**: Multi-critter array `critters`, explicit `ownerId`, and `activeCritterId`.
  - **v3**: Replaces legacy berry fields with `learnedBehaviors['sunberry-foraging']`.
- Fail-closed validation: invalid, corrupted, or future-schema saves reject cleanly without
  overwriting the database.
- Web Locks API used for single-tab writer coordination.

---

## Architectural foundations needed next

Before future Astra sessions can implement broader gameplay, several foundational
architectural generalizations must be introduced incrementally:

### 1. Viewport & Canvas Decoupling

- **Current problem**: The Three.js canvas in `app.ts` shares flex/grid flow with the
  bottom interaction dock. When approaching an object, the dock renders, changing the
  viewport height and causing Three.js to recompute aspect ratio and render buffers,
  producing noticeable visual jitter.
- **Architecture needed**: Decouple the canvas into an absolute or fixed background diorama
  layer. Interaction UI, HUD elements, and dialogs must live in a dedicated overlay layer
  that floats above the canvas without triggering DOM reflows of the 3D viewport.

### 2. Unified Actor Capability Model

- **Current problem**: The player entity has only `stamina` and `coins`, while critters have
  `stats` (STR, END, SPD, INT) and hardcoded `skills` (harvesting, racing).
- **Architecture needed**: Create a shared `ActorCapabilities` interface implemented by both
  Player and Critter:
  ```typescript
  export interface ActorCapabilities {
    stats: { strength: number; endurance: number; speed: number; intelligence: number };
    skills: Record<string, number>;
  }
  ```
  This allows check resolution and tool handling to treat humans and critters uniformly.

### 3. Extensible Check & Resolution Engine

- **Current problem**: Action outcomes are hardcoded if-statements in `host.ts`.
- **Architecture needed**: A pure resolution function in the host:
  ```typescript
  export interface CheckRequest {
    actorId: string;
    skillId: string;
    statWeights: Partial<Record<'strength' | 'endurance' | 'speed' | 'intelligence', number>>;
    toolQuality?: number;
    difficulty: number;
    circumstances?: number;
  }

  export interface CheckResult {
    success: boolean;
    degree: number; // normalized margin (-1.0 to +1.0)
    staminaCost: number;
    timeMinutes: number;
    skillXpGained: number;
    statXpGained: Partial<Record<string, number>>;
    sideEffects?: string[];
  }
  ```

### 4. Localized Container Architecture

- **Current problem**: All items exist in a single flat array `state.inventory`.
- **Architecture needed**: Decompose inventory into localized containers:
  ```typescript
  export interface Container {
    id: string;
    ownerEntityId?: string; // player, critter, chest, refrigerator, mill hopper
    capacitySlots: number;
    allowedItemCategories?: string[];
    items: InventoryItem[];
  }
  ```
  The player's backpack, a companion's satchel, a tool rack, a wooden chest, and a grain
  hopper all become instances of `Container`.

### 5. Multi-Plot Spatial Farming Grid

- **Current problem**: `state.crop` is a single hardcoded object representing one feed plot.
- **Architecture needed**: A spatial collection of soil plots:
  ```typescript
  export interface SoilPlot {
    id: string;
    position: Point;
    tilled: boolean;
    moistureMinutesRemaining: number;
    fertilizerId?: string;
    crop?: {
      speciesId: string;
      plantedAtMinute: number;
      currentStage: number;
      qualityBonus: number;
    };
  }
  ```

### 6. Compositional Job & Task Scheduling

- **Current problem**: Only sunberry foraging exists, executed directly inside host methods.
- **Architecture needed**: A task decomposition pipeline where a job (e.g., "Maintain Garden")
  breaks down into executable atomic sub-tasks:
  1. `inspect_plot` $\rightarrow$ find dry or unweeded plot
  2. `fetch_tool_or_water` $\rightarrow$ walk to well, fill can
  3. `apply_action` $\rightarrow$ water plot
  4. `deposit_harvest` $\rightarrow$ carry produce to local crate

---

## Save contract and evolution rules

1. **Explicit version migration**: All changes to `GameState` schema require incrementing
   `GameState.version` and providing a dedicated, chained migration function in `storage.ts`
   (e.g., `migrateV3ToV4`).
2. **Frozen legacy fixtures**: Every schema migration must be accompanied by frozen historical
   fixtures in `src/app/game/fixtures/` proving that legacy saves migrate with 100% data
   fidelity.
3. **Fail-closed guarantees**: If a loaded save contains corrupted, unrecognized, or
   out-of-bounds data, `validateSave` must reject it without modifying the persisted store.
4. **No data discarding**: Never drop unrecognized fields or silently reset player progress
   to force a schema migration to succeed.
5. **Deterministic continuation**: Migration must never reroll ongoing training, recalculate
   random outcomes, or replay one-time milestones.
