# Decisions and open questions

Canonical architectural and product decisions for Critterstead. This document records
settled rationale, architectural precedents, and unresolved questions.

- “Accepted” indicates settled design or engineering direction, not that the code is
  already implemented.
- “Implemented” indicates functionality verified in the codebase.
- Supersede decisions explicitly with new entries rather than mutating historical records.

For full product semantics, see [GAME-DESIGN.md](GAME-DESIGN.md).
For implementation boundaries and save contracts, see [ARCHITECTURE.md](ARCHITECTURE.md).
For sequencing, see [ROADMAP.md](ROADMAP.md) and [exec-plans/README.md](exec-plans/README.md).

---

## Decision index

| ID      | Title                                                   | Status         | Rationale / Owning Reference                                                                                                |
| :------ | :------------------------------------------------------ | :------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **D01** | Prove one-critter daily loop before full prologue       | Accepted       | [Roadmap](ROADMAP.md)                                                                                                       |
| **D02** | Grandpa owns ancient Pip; Pip outlives Grandpa          | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                           |
| **D03** | Childhood start; Grandpa's unavoidable death            | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                           |
| **D04** | Choose exactly one starter at acquisition               | Accepted       | [Acquisition](GAME-DESIGN.md#opening-and-acquisition)                                                                       |
| **D05** | Three visible active critters in party                  | Accepted       | [Ownership](GAME-DESIGN.md#exploration-adventuring-and-party-structure)                                                     |
| **D06** | Generalized observation-to-autonomy learning            | Accepted       | [Learning](GAME-DESIGN.md#learned-behavior-jobs-and-delegation)                                                             |
| **D07** | Nine foundational families; Brindlekin as lineage       | Accepted       | [Families](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                          |
| **D08** | Gene technology combines any two critters               | Accepted       | [Gene Tech](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                         |
| **D09** | Authored family-pairing morphology                      | Accepted       | [Morphology](GAME-DESIGN.md#morphology-body-simulation-and-encumbrance)                                                     |
| **D10** | Natural aging; nonlethal Colosseum combat               | Accepted       | [Life Cycle](GAME-DESIGN.md#critter-care-health-aging-and-mortality)                                                        |
| **D11** | Multi-purpose Colosseum venue                           | Accepted       | [Colosseum](GAME-DESIGN.md#the-colosseum)                                                                                   |
| **D12** | Friendly competitive cousin; scripted protagonist       | Reopened (D39) | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                           |
| **D13** | Local host authority, deterministic seed, safe saves    | Accepted       | [Architecture](ARCHITECTURE.md#boundaries-and-invariants)                                                                   |
| **D14** | Shared docs, thin entrypoints, bounded plans            | Accepted       | [Conventions](exec-plans/README.md)                                                                                         |
| **D15** | Individual value is independent of usefulness           | Accepted       | [Core Promise](GAME-DESIGN.md#core-values-and-critter-philosophy)                                                           |
| **D16** | Multi-critter array, ownerId, save v2                   | Implemented    | [Architecture](ARCHITECTURE.md#save-contract-and-evolution-rules)                                                           |
| **D17** | Authored behaviors table, behavior IDs, save v3         | Implemented    | [Architecture](ARCHITECTURE.md#save-contract-and-evolution-rules)                                                           |
| **D18** | Player-visible milestone rule after foundation          | Accepted       | [Roadmap](ROADMAP.md)                                                                                                       |
| **D19** | Grandpa Colosseum champion & Pip creation cost          | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                           |
| **D20** | Distinction: owner, party, active companion             | Accepted       | [Architecture](ARCHITECTURE.md#boundaries-and-invariants)                                                                   |
| **D21** | M3 daily choice: Rest together, dock UI, retuned energy | Accepted       | [Plan 001](exec-plans/active/001-deepen-one-critter-daily-loop.md#m3--make-care-effort-and-recovery-produce-a-daily-choice) |
| **D22** | Testing fresh-start reset vs save migration             | Accepted       | [Development](DEVELOPMENT.md#human-testing-fresh-start-vs-migration-instructions)                                           |
| **D23** | Local verification gates; non-blocking remote CI        | Accepted       | [Development](DEVELOPMENT.md#verification-workflow-and-remote-ci)                                                           |
| **D24** | Design references as shorthand, original expression     | Accepted       | [Disclaimer](GAME-DESIGN.md#design-reference-disclaimer)                                                                    |
| **D25** | Unified 4-stat system and separate skill taxonomy       | Accepted       | [Stats & Skills](GAME-DESIGN.md#core-capability-stats)                                                                      |
| **D26** | Physical logistics and localized storage                | Accepted       | [Logistics](GAME-DESIGN.md#physical-logistics-and-storage)                                                                  |
| **D27** | Extensible simulation checks with failure degrees       | Accepted       | [Checks](GAME-DESIGN.md#checks-and-simulation)                                                                              |
| **D28** | Distinct dual combat models (adventure vs Colosseum)    | Accepted       | [Combat](GAME-DESIGN.md#exploration-adventuring-and-party-structure)                                                        |
| **D29** | Authored macro-spaces, player micro-spaces              | Accepted       | [Layout](GAME-DESIGN.md#construction-and-spatial-layout)                                                                    |
| **D30** | Fixed 120-day calendar and cottage wall calendar        | Accepted       | [Calendar](GAME-DESIGN.md#calendar-time-and-seasons)                                                                        |
| **D31** | Monster Rancher training minigames family               | Accepted       | [Training](GAME-DESIGN.md#training-system)                                                                                  |
| **D32** | Viewport decoupling from interaction dock UI            | Accepted       | [Architecture](ARCHITECTURE.md#1-viewport--canvas-decoupling)                                                               |
| **D33** | Restructured Campaign 001 vertical slice runway         | Accepted       | [Roadmap](ROADMAP.md)                                                                                                       |
| **D41** | Offline game first; sharing critters is a later wish    | Accepted       | [Identity](GAME-DESIGN.md#high-level-game-identity)                                                                         |
| **D40** | Opening walk; starter offer of three primary families   | Accepted       | [Opening](GAME-DESIGN.md#opening-and-acquisition)                                                                           |
| **D39** | Childhood centers on Grandpa; cousin reopened           | Accepted       | [Years with Grandpa](GAME-DESIGN.md#the-years-with-grandpa)                                                                 |
| **D38** | Quests read from the save; growth is visible and counts | Implemented    | [Plan 001 playtest 2](exec-plans/active/001-deepen-one-critter-daily-loop.md#playtest-2-follow-up--2026-10-01)              |
| **D37** | One place for each kind of feedback; touch steering     | Implemented    | [Plan 001 M9](exec-plans/active/001-deepen-one-critter-daily-loop.md#m9-evidence--2026-09-30)                               |
| **D36** | Full-screen living diorama with a following camera      | Implemented    | [Plan 002](exec-plans/completed/002-living-diorama-presentation.md)                                                         |
| **D35** | Per-discipline same-day training curve; gauge drills    | Implemented    | [Plan 001 M8](exec-plans/active/001-deepen-one-critter-daily-loop.md#m8-evidence--2026-09-29)                               |
| **D34** | Moisture-gated growth, dawn boundary, hashed weather    | Implemented    | [Plan 001 M7](exec-plans/active/001-deepen-one-critter-daily-loop.md#m7-evidence--2026-09-29)                               |

---

## Detailed records

### D15 — Individual value is independent of usefulness (accepted 2026-09-26)

A critter’s usefulness and a critter’s value are not the same thing. Raising,
breeding, specialization, and competition may reward different abilities while
care remains appropriate for every individual. The emotional core of the game
requires that critters are treated as living household members, not disposable
production units. [Core Promise](GAME-DESIGN.md#core-values-and-critter-philosophy).

### D16 — Minimal identity model and save v2 (implemented 2026-09-26)

Store individuals in `critters`, ownership in `ownerId`, and the single playable
selection in `activeCritterId`. Resolve entities strictly by ID, never array order.
Per-individual care and participant-bound training prevent actions from bleeding
between entities. Migrate v1 saves safely to v2 with 100% data retention.
[Save Contract](ARCHITECTURE.md#save-contract-and-evolution-rules).

### D17 — Authored learning and save v3 (implemented 2026-09-26)

Replace ad-hoc berry knowledge fields with an authored `BEHAVIORS` table and a
per-individual numeric progress map `learnedBehaviors`. Only `sunberry-foraging`
is active in M2. Preserves legacy observation points without data loss.
[Save Contract](ARCHITECTURE.md#save-contract-and-evolution-rules).

### D18 — Player-visible milestone rule after foundation (accepted 2026-09-26)

Following foundational milestones M1 and M2, every implementation milestone must
produce an observable gameplay consequence in ordinary play. Architectural prep
that produces no user-visible change belongs in supporting subtasks, not product
milestones. [Milestone Rule](exec-plans/active/001-deepen-one-critter-daily-loop.md#player-visible-milestone-rule).

### D19 — Canonical narrative background for Grandpa and Pip (accepted 2026-09-26)

Grandpa was the former Colosseum grand champion. He spent his life's accumulated fortune
on the creation of Pip. The player grows up knowing him simply as Grandpa and discovers
his renown organically later. Pip belongs to Grandpa, is extraordinarily old and experienced,
and mentors the player's companions after Grandpa passes away. [Household](GAME-DESIGN.md#narrative-canon-and-household-history).

### D20 — Distinction between ownership, party, and active companion (accepted 2026-09-26)

An entity's owner (`ownerId`), party membership (inclusion in the 3-companion group),
and active working companion status (`activeCritterId`) are separate concepts.
Pip can remain Grandpa-owned while accompanying the party. The Stage-1 rule requiring
player ownership for the active companion is a temporary implementation limitation.
[Architecture](ARCHITECTURE.md#boundaries-and-invariants).

### D21 — M3 daily choice, daytime rest, and compact interaction dock (accepted 2026-09-26)

M3 introduces the daytime recovery action **Rest together** at the companion's nook
(costing 90–120 game minutes, restoring player/critter stamina), retunes energy costs
so work visibly depletes stamina, and replaces the intrusive nearby interaction card
with a compact bottom interaction dock. [Plan 001](exec-plans/active/001-deepen-one-critter-daily-loop.md#m3--make-care-effort-and-recovery-produce-a-daily-choice).

M3 implementation uses the existing stamina/hunger model and save v3. Rest and
effort parameters remain provisional; independent work keeps a small energy reserve
that explicit cues may spend. Current rules are in
[Architecture](ARCHITECTURE.md#care-effort-recovery-and-the-interaction-dock), with
routine comparisons and the pending human product assessment in the active plan.

### D22 — Testing process: fresh-start vs. migration instructions (accepted 2026-09-26)

IndexedDB persists state across browser hard reloads (Shift+F5). Human test
instructions must explicitly distinguish fresh-start evaluation (opening developer
kit with backtick, selecting "Reset saved game") from legacy save migration.
[Development](DEVELOPMENT.md#human-testing-fresh-start-vs-migration-instructions).

### D23 — Local verification gate and non-blocking remote CI (accepted 2026-09-26)

Implementation agents must verify quality gates locally first. Once local checks pass,
changes are committed and pushed. Sessions must not idle or poll GitHub Actions
unless explicitly debugging CI. [Development](DEVELOPMENT.md#verification-workflow-and-remote-ci).

### D24 — Design references as shorthand, original expression (accepted 2026-09-27)

References to commercial titles (_Rune Factory_, _Monster Rancher_, _Graveyard Keeper_,
_Palworld_, _Dragon's Dogma_, _RimWorld_, _Mewgenics_) are comparative design shorthand
for mechanical depth, pacing, and interaction style. They are not instructions to copy
protected art, code, characters, dialogue, branding, or proprietary data. Critterstead
maintains completely original assets, world fiction, and architecture.
[Disclaimer](GAME-DESIGN.md#design-reference-disclaimer).

### D25 — Unified 4-stat system and separate skill taxonomy (accepted 2026-09-27)

Humans and critters share the same conceptual four capability stats: STR, END, SPD, INT
(~1–999). Stats grow slowly from action checks and dedicated training. Learned skills
(~1–99) represent recognizable trades and professions (Mining, Woodcutting, Farming,
Cooking, Smithing, Hauling, Racing) and progress with experience. Happiness/wellbeing is
a condition of the critter, not a capability stat. [Stats & Skills](GAME-DESIGN.md#core-capability-stats).

### D26 — Physical logistics and localized storage (accepted 2026-09-27)

Critterstead rejects magical global homestead inventories. Items physically exist where
placed: in backpack slots, critter satchels, wooden chests, kitchen refrigerators, or
workstation hoppers. Production chains require physical delivery of inputs, creating
emergent failure chains (such as a broken hammer halting a smithy until lumber and metal
are hauled to forge a replacement). [Logistics](GAME-DESIGN.md#physical-logistics-and-storage).

### D27 — Extensible simulation checks with failure degrees (accepted 2026-09-27)

Gameplay actions resolve via a pure check function:
`Skill + f(Stats) + Tool Quality + Modifiers vs Difficulty`. Results are felt through
tempo, stamina cost, yield quantity/quality, and tool wear. Failures have degrees
(wasted time, lower yield, tool breakage, minor injury, fire) and can cascade through
interconnected systems. Mechanics are inspectable via an optional diagnostic log.
[Checks](GAME-DESIGN.md#checks-and-simulation).

### D28 — Distinct dual combat models and clinic revival direction (accepted 2026-09-27)

Exploration combat in wild areas and dungeons is real-time, tense, and genuinely dangerous.
Defeat collapses the expedition. In ordinary play, defeat results in revival or reconstitution
at an Oakhaven clinic with meaningful economic or resource consequences (medical fees, loss of
unbanked proceeds, recovery penalties). Running out of money is not automatic permanent death
in normal mode (potential handling includes medical debt, resource forfeiture, or reloading).
In late progression, the player may build a personal revival / reconstitution / clone-pod-like
facility on the stead utilizing the setting's advanced biological and genetic technology. An
optional future Ironman mode may disable or severely restrict revival and enforce permanent death.
Town Colosseum competition is turn-based, theatrical, and strictly nonlethal, showcasing critter
stats, initiative, and training before a stadium crowd.
[Combat](GAME-DESIGN.md#exploration-adventuring-and-party-structure).

### D29 — Authored macro-spaces, player micro-spaces (accepted 2026-09-27)

World macro-spaces (homestead footprint, cottage shell, barn foundation, town square,
quarry, mine, forest, dungeon) are authored 2.5D orthographic dioramas. Within buildable
property zones, players freely place and arrange storage chests, appliances, workstations,
fences, and paths, turning layout into a logistical puzzle.
[Layout](GAME-DESIGN.md#construction-and-spatial-layout).

### D30 — Fixed 120-day calendar and cottage wall calendar (accepted 2026-09-27)

The year comprises 4 seasons of 30 days each (120 game days total). An inspectable wall
calendar in the cottage tracks festivals, Colosseum fixtures, market days, birthdays,
and request deadlines. [Calendar](GAME-DESIGN.md#calendar-time-and-seasons).

### D31 — Monster Rancher training minigames family (accepted 2026-09-27)

Training expands from a single rhythm hoop into a family of activity-matched interactive
minigames (weight lifting, distance pacing, SIMON reflex, command sequences, hauling pulls,
obstacle courses, woodchopping, fishing). Training incurs diminishing returns within a
single day to encourage balanced schedules. [Training](GAME-DESIGN.md#training-system).

### D32 — Viewport decoupling from interaction dock UI (accepted 2026-09-27)

The Three.js viewport canvas must remain stable and fixed in size/aspect ratio regardless
of nearby interaction card or dock changes. Overlay UI elements float above the scene
without triggering layout reflows or camera projection recalculations.
[Architecture](ARCHITECTURE.md#1-viewport--canvas-decoupling).

### D33 — Restructured Campaign 001 vertical slice runway (accepted 2026-09-27)

The post-M3 runway (formerly narrow M4–M6) is restructured into a multi-milestone
progression (M3 through M9) that systematically builds toward a rich, player-visible
vertical slice: Rancher stats/checks, localized storage/carrying, compositional jobs,
expanded farming/calendar, diverse training minigames, and a comprehensive playtest gate.
[Roadmap](ROADMAP.md).

### D34 — Moisture-gated growth, dawn boundary, hashed weather (implemented 2026-09-29)

Crops grow in game minutes only while their bed is moist. Watering lasts until the next
06:00 dawn; rain and season withering are applied at dawn. Weather is a fixed hash of the
day, so forecasts are knowable in advance and never perturb seeded outcomes. The tradeoff:
all saves share the same weather. Crop constants remain provisional.

### D35 — Per-discipline same-day training curve; gauge drills (implemented 2026-09-29)

Each training discipline tracks its own sessions per game day; repeats give 100/55/30/15%
gains, shown before the player commits. Competitions are once-a-day and outside the
curve. Strength and endurance drills are timed gauges rather than more timing cues, so
each discipline asks for a different kind of attention. Constants remain provisional;
tonics and recovery items stay future work.

### D36 — Full-screen living diorama with a following camera (implemented 2026-09-30)

The world fills the screen and the HUD floats over it; the orthographic camera follows the
rancher at a fixed angle and frames the area the HUD leaves uncovered, so the dock never
hides the rancher and the canvas never resizes (D32 holds). Areas continue past the fence
as non-walkable scenery; time of day, weather and season are visible. Rendering tiers keep
software renderers and phones fast. Presentation only: rules and saves are unchanged.

### D37 — One place for each kind of feedback; touch steering (implemented 2026-09-30)

From the first human playtest: players could not tell where to look for stats or for an
action's result, and a drill's start button sat where its tap button had been. Results now
appear just above the actions and fade, with what changed floating over whoever changed;
stats live only in the details panel, where changed values glow; a finished drill's result
holds its card's place until stray taps have passed. On touch screens a held finger steers
the rancher and on-screen arrows are optional. Results are derived from state snapshots in
the presentation layer; the host still owns every rule.

### D38 — Quests read from the save; growth is visible and counts (implemented 2026-10-01)

From the second playtest. The journal's quests ("today" and "your journey") are a pure
reading of the save (`objectives.ts`), never stored, so no migration or duplicate truth
exists. A companion's growth must be both real and shown: foraging already improved with
practice, intelligence and bond, and hauling pace now rises with speed above 4 and hauling
practice (+3% per point of speed, +2% per practice level, capped at +50%, provisional).
Both appear as plain "what this earns" lines in a Learning tab, and each new stage is
announced. On-screen arrows are removed; touch steering replaces them.

### D39 — The childhood centers on Grandpa; cousin reopened (accepted 2026-10-02)

From the first vision session. The prologue spends its time developing Grandpa, because
the game's emotional core is losing him, keeping his name alive and learning who he was.
Provisional length: two or three spring-and-summer years, with the first winter after his
passing. Pip stays afterwards, visiting Grandpa's old spots and teaching the player's
critters basic jobs. The cousin of D12 is a maybe, not canon; D12's scripted protagonist
is unaffected. [Household](GAME-DESIGN.md#narrative-canon-and-household-history).

### D40 — Opening walk and starter offer (accepted 2026-10-02)

The starter is chosen after a scripted walk to Oakhaven: Pip demonstrates berry picking,
the player meets Gemothy (an unowned raccoon-like chimera scavenger), Grandpa explains the
ways to partner with a critter, and Mallow appears as an example. The offer is three
critters of different primary families: Mallow, recast from Brindlekin into a primary
family so Pip stays unique, plus two families drawn at random without duplicates (under
D13, from the save's seed). Stage 2 must therefore build real primary-family archetypes,
not only Brindlekin. [Opening](GAME-DESIGN.md#opening-and-acquisition).

### D41 — Offline game first (accepted 2026-10-02)

Critterstead ships as a complete offline game. Its aim is that players grow proud enough
of their critters to want to show them off; sharing them with other players (seasonal
competition days, viewing others' critters) is a distant extension needing its own
decision, not present scope. No backend, accounts or multiplayer architecture until then.

---

## Open or exploratory — do not invent canon

The following areas are intentionally open for iterative design and human playtesting.
Agents must not invent hardcoded canon or premature balance constants for these areas:

| Question                                               | Current boundary / When it matters                                                                                                                                                 |
| :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exact skill progression formulas & XP curves**       | Skills range 1–99; concrete formulas will be calibrated during playtesting.                                                                                                        |
| **Stat check weighting coefficients**                  | Formula direction is accepted; exact math weights will be tuned during M4.                                                                                                         |
| **Tool physical requirements & skill mastery scaling** | Physical usability (stats/morphology) gates handling; learned proficiency unlocks tool potential. Exact physical thresholds, item levels, skill breakpoints, and quality formulas. |
| **Expedition defeat penalties & clinic revival fees**  | Clinic revival and late-game personal reconstitution pod are accepted design direction; exact fee structures, debt rules, and lore terms remain open.                              |
| **Training diminishing-return curves & tonics**        | Diminishing returns are settled; exact fatigue numbers will be calibrated in M8.                                                                                                   |
| **Breeding inheritance math & chimera genetics**       | 9 families and artificial growth tech are settled; genetics algorithm belongs to Stage 4.                                                                                          |
| **Work priority & assignment UI presentation**         | RimWorld-like depth with friendly diegetic UI is settled; exact visual interface is open.                                                                                          |
| **Complete crop catalog & growth constants**           | Multi-crop seasonal farming is settled; specific species tables belong to M7.                                                                                                      |
| **Appliance & workstation recipe catalog**             | Physical input/output logistics settled; specific crafting recipes expand with progression.                                                                                        |
| **Town resident schedules & relationship arcs**        | Town of Oakhaven settled; individual NPC dialog and heart events belong to Stage 2.                                                                                                |
| **Turn-based Colosseum movesets & damage math**        | Nonlethal, theatrical, SPD-turn-order settled; specific combat skills belong to Stage 3.                                                                                           |
| **Automation throughput caps & scaling limits**        | Physical logistics settled; maximum autonomous efficiency will be playtested.                                                                                                      |
| **Personality traits & preference influence**          | Evolving preferences settled; specific happiness formulas remain tunable.                                                                                                          |
| **Critter longevity & end-of-life timing**             | Natural aging and respectful mortality settled; 1200-day placeholder is not fixed canon.                                                                                           |
| **Mallow's family and Pip's kind**                     | Mallow becomes one of the nine primary families (D40); which one is open. Whether Brindlekin becomes Pip's unique kind is open.                                                    |
| **Childhood calendar mechanics**                       | Spring-and-summer-only years are settled direction; whether autumn and winter are skipped or time-skipped is undecided until it can be felt in play.                               |
| **Story beats across the Grandpa years**               | What happens in each of the 2–3 years, and the first winter's exact narrative role, are open.                                                                                      |
| **Grandma and wider family**                           | The player lives with grandparents; only Grandpa has canon. Do not invent the rest.                                                                                                |
| **Final place names**                                  | Oakhaven, Bramblewick and the other areas are working names.                                                                                                                       |
| **Gemothy's return**                                   | Finding him again and possibly recruiting him is desired; when, where and how is open.                                                                                             |
| **Chimera breed naming scheme**                        | Players name individuals, not breeds; a generated breed-naming scheme is not yet designed.                                                                                         |
