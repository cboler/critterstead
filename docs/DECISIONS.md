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

| ID      | Title                                                     | Status         | Rationale / Owning Reference                                                                                                   |
| :------ | :-------------------------------------------------------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **D01** | Prove one-critter daily loop before full prologue         | Accepted       | [Roadmap](ROADMAP.md)                                                                                                          |
| **D02** | Grandpa owns ancient Pip; Pip outlives Grandpa            | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                              |
| **D03** | Childhood start; Grandpa's unavoidable death              | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                              |
| **D04** | Choose exactly one starter at acquisition                 | Accepted       | [Acquisition](GAME-DESIGN.md#opening-and-acquisition)                                                                          |
| **D05** | Three visible active critters in party                    | Accepted       | [Ownership](GAME-DESIGN.md#exploration-adventuring-and-party-structure)                                                        |
| **D06** | Generalized observation-to-autonomy learning              | Accepted       | [Learning](GAME-DESIGN.md#learned-behavior-jobs-and-delegation)                                                                |
| **D07** | Nine foundational families; Brindlekin as lineage         | Accepted       | [Families](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                             |
| **D08** | Gene technology combines any two critters                 | Accepted       | [Gene Tech](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                            |
| **D09** | Authored family-pairing morphology                        | Accepted       | [Morphology](GAME-DESIGN.md#morphology-body-simulation-and-encumbrance)                                                        |
| **D10** | Natural aging; nonlethal Colosseum combat                 | Accepted       | [Life Cycle](GAME-DESIGN.md#critter-care-health-aging-and-mortality)                                                           |
| **D11** | Multi-purpose Colosseum venue                             | Accepted       | [Colosseum](GAME-DESIGN.md#the-colosseum)                                                                                      |
| **D12** | Friendly competitive cousin; scripted protagonist         | Reopened (D39) | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                              |
| **D13** | Local host authority, deterministic seed, safe saves      | Accepted       | [Architecture](ARCHITECTURE.md#boundaries-and-invariants)                                                                      |
| **D14** | Shared docs, thin entrypoints, bounded plans              | Accepted       | [Conventions](exec-plans/README.md)                                                                                            |
| **D15** | Individual value is independent of usefulness             | Accepted       | [Core Promise](GAME-DESIGN.md#core-values-and-critter-philosophy)                                                              |
| **D16** | Multi-critter array, ownerId, save v2                     | Implemented    | [Architecture](ARCHITECTURE.md#save-contract-and-evolution-rules)                                                              |
| **D17** | Authored behaviors table, behavior IDs, save v3           | Implemented    | [Architecture](ARCHITECTURE.md#save-contract-and-evolution-rules)                                                              |
| **D18** | Player-visible milestone rule after foundation            | Accepted       | [Roadmap](ROADMAP.md)                                                                                                          |
| **D19** | Grandpa Colosseum champion & Pip creation cost            | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                              |
| **D20** | Distinction: owner, party, active companion               | Accepted       | [Architecture](ARCHITECTURE.md#boundaries-and-invariants)                                                                      |
| **D21** | M3 daily choice: Rest together, dock UI, retuned energy   | Accepted       | [Plan 001](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m3--make-care-effort-and-recovery-produce-a-daily-choice) |
| **D22** | Testing fresh-start reset vs save migration               | Accepted       | [Development](DEVELOPMENT.md#human-testing-fresh-start-vs-migration-instructions)                                              |
| **D23** | Local verification gates; non-blocking remote CI          | Accepted       | [Development](DEVELOPMENT.md#verification-workflow-and-remote-ci)                                                              |
| **D24** | Design references as shorthand, original expression       | Accepted       | [Disclaimer](GAME-DESIGN.md#design-reference-disclaimer)                                                                       |
| **D25** | Unified 4-stat system and separate skill taxonomy         | Accepted       | [Stats & Skills](GAME-DESIGN.md#core-capability-stats)                                                                         |
| **D26** | Physical logistics and localized storage                  | Accepted       | [Logistics](GAME-DESIGN.md#physical-logistics-and-storage)                                                                     |
| **D27** | Extensible simulation checks with failure degrees         | Accepted       | [Checks](GAME-DESIGN.md#checks-and-simulation)                                                                                 |
| **D28** | Distinct dual combat models (adventure vs Colosseum)      | Accepted       | [Combat](GAME-DESIGN.md#exploration-adventuring-and-party-structure)                                                           |
| **D29** | Authored macro-spaces, player micro-spaces                | Accepted       | [Layout](GAME-DESIGN.md#construction-and-spatial-layout)                                                                       |
| **D30** | Fixed 120-day calendar and cottage wall calendar          | Accepted       | [Calendar](GAME-DESIGN.md#calendar-time-and-seasons)                                                                           |
| **D31** | Monster Rancher training minigames family                 | Accepted       | [Training](GAME-DESIGN.md#training-system)                                                                                     |
| **D32** | Viewport decoupling from interaction dock UI              | Accepted       | [Architecture](ARCHITECTURE.md#1-viewport--canvas-decoupling)                                                                  |
| **D33** | Restructured Campaign 001 vertical slice runway           | Accepted       | [Roadmap](ROADMAP.md)                                                                                                          |
| **D53** | A Colosseum ladder of athletic cups; bouts on top         | Accepted       | [Plan 005](exec-plans/active/005-colosseum-ladder.md)                                                                          |
| **D52** | Colosseum events on the calendar (save v12)               | Implemented    | [Plan 004](exec-plans/completed/004-training-and-exhibitions.md)                                                               |
| **D51** | Routines unlock by practice together (save v11)           | Implemented    | [Plan 004](exec-plans/completed/004-training-and-exhibitions.md)                                                               |
| **D50** | Lifespan is a family trait and is inherited               | Accepted       | [Aging](GAME-DESIGN.md#aging-and-respectful-mortality)                                                                         |
| **D49** | Brindlekin is a chimera lineage                           | Accepted       | [Families](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                             |
| **D48** | Two ways to train: together or as a routine               | Accepted       | [Training](GAME-DESIGN.md#training-system)                                                                                     |
| **D47** | Raise critters for the Colosseum; training first          | Accepted       | [Plan 004](exec-plans/completed/004-training-and-exhibitions.md)                                                               |
| **D46** | The opening walk plays before any save; old saves skip it | Implemented    | [Plan 003](exec-plans/active/003-household-and-opening.md)                                                                     |
| **D45** | Grandpa, Pip and Oakhaven in every household (save v10)   | Implemented    | [Plan 003](exec-plans/active/003-household-and-opening.md)                                                                     |
| **D44** | Pip is the one Brindlekin                                 | Accepted       | [Household](GAME-DESIGN.md#narrative-canon-and-household-history)                                                              |
| **D43** | Stage 2 begins; Campaign 001 gate closed                  | Accepted       | [Plan 003](exec-plans/active/003-household-and-opening.md)                                                                     |
| **D42** | Chimera breed names join the parents' names               | Accepted       | [Families](GAME-DESIGN.md#genetics-lineages-breeding-and-chimeras)                                                             |
| **D41** | Offline game first; sharing critters is a later wish      | Accepted       | [Identity](GAME-DESIGN.md#high-level-game-identity)                                                                            |
| **D40** | Opening walk; starter offer of three primary families     | Accepted       | [Opening](GAME-DESIGN.md#opening-and-acquisition)                                                                              |
| **D39** | Childhood centers on Grandpa; cousin reopened             | Accepted       | [Years with Grandpa](GAME-DESIGN.md#the-years-with-grandpa)                                                                    |
| **D38** | Quests read from the save; growth is visible and counts   | Implemented    | [Plan 001 playtest 2](exec-plans/completed/001-deepen-one-critter-daily-loop.md#playtest-2-follow-up--2026-10-01)              |
| **D37** | One place for each kind of feedback; touch steering       | Implemented    | [Plan 001 M9](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m9-evidence--2026-09-30)                               |
| **D36** | Full-screen living diorama with a following camera        | Implemented    | [Plan 002](exec-plans/completed/002-living-diorama-presentation.md)                                                            |
| **D35** | Per-discipline same-day training curve; gauge drills      | Implemented    | [Plan 001 M8](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m8-evidence--2026-09-29)                               |
| **D34** | Moisture-gated growth, dawn boundary, hashed weather      | Implemented    | [Plan 001 M7](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m7-evidence--2026-09-29)                               |

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
milestones. [Milestone Rule](exec-plans/completed/001-deepen-one-critter-daily-loop.md#player-visible-milestone-rule).

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
with a compact bottom interaction dock. [Plan 001](exec-plans/completed/001-deepen-one-critter-daily-loop.md#m3--make-care-effort-and-recovery-produce-a-daily-choice).

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
critters of different primary families: Mallow, recast from Brindlekin as Canine so Pip
stays unique, plus two other families drawn at random without duplicates (under
D13, from the save's seed). Stage 2 must therefore build real primary-family archetypes,
not only Brindlekin. [Opening](GAME-DESIGN.md#opening-and-acquisition).

### D41 — Offline game first (accepted 2026-10-02)

Critterstead ships as a complete offline game. Its aim is that players grow proud enough
of their critters to want to show them off; sharing them with other players (seasonal
competition days, viewing others' critters) is a distant extension needing its own
decision, not present scope. No backend, accounts or multiplayer architecture until then.

### D42 — Chimera breed names join the parents' names (accepted 2026-10-02)

First pass: a chimera's breed name concatenates its parents' breed or family names, whole
or partial words. Players name individuals, never breeds. Refinements wait for Stage 4.

### D43 — Stage 2 begins (accepted 2026-10-02)

The product owner closed Campaign 001's gate and authorized Stage 2. Remaining tester
feedback arrives as tweaks along the way rather than holding the gate.
[Plan 003](exec-plans/active/003-household-and-opening.md).

### D44 — Pip is the one Brindlekin (accepted 2026-10-02)

Brindlekin, the stabilized woodland lineage, is Grandpa's life's work and Pip is its only
living member, so Pip stays one of a kind. [Household](GAME-DESIGN.md#narrative-canon-and-household-history).

### D45 — Grandpa, Pip and Oakhaven in every household (implemented 2026-10-02)

Save v10 adds Oakhaven as an area and Grandpa's Pip (owned by `grandpa`, with an empty
satchel) to every save; a legacy companion named Pip keeps its own id and owner. Grandpa and
Pip are placed by a daily routine computed from the clock, weather and Pip's two morning
picks, so their positions are not saved. Pip's picks go to the yard chest, and a companion
within sight learns from watching him as it would from you. Everyone now ages overnight.
The Colosseum is reached through Oakhaven rather than the glade.
[Plan 003 M2](exec-plans/active/003-household-and-opening.md#m2-evidence--2026-10-02).

### D46 — The opening walk plays before any save (implemented 2026-10-03)

New games open on the walk to Oakhaven: authored beats staged on a throwaway state (Pip at
the hedge, Gemothy and the tavern bin, Grandpa's ways of partnering, Mallow, then the
choice in the square). It can be skipped to the choice, and nothing is saved until a critter
is taken home; the household then starts the next morning, as before. Existing saves skip
the prologue (product owner, 2026-10-03).
[Plan 003 M3](exec-plans/active/003-household-and-opening.md#m3-evidence--2026-10-03).

### D47 — Raise critters for the Colosseum (accepted 2026-10-03)

The game's spine is the original critter-raising loop: train, compete, earn, raise
stronger critters. Farming, hauling and the stead's automation are what critters and the
player do between training, and how critters earn their keep; nothing is cut. Training and
exhibitions (plan 004) come before the years with Grandpa, with the Colosseum ladder next;
systems start shallow, as in _Monster Rancher_, and deepen through iteration.
[Identity](GAME-DESIGN.md#high-level-game-identity), [plan 004](exec-plans/completed/004-training-and-exhibitions.md).

### D48 — Two ways to train (accepted 2026-10-03)

Each drill is a real-time minigame played together, which costs the critter less energy and
pays from poor to excellent on your play, and, once played, a routine chosen from a menu,
which costs the critter more and you little, usually pays a fair amount and occasionally
more. Two drills per stat, each a short game of a familiar pattern; a wider-timing assist
covers every drill. [Training](GAME-DESIGN.md#training-system).

### D49 — Brindlekin is a chimera lineage (accepted 2026-10-03)

Refines D44: Pip is a chimera, as Brindlekin is a stabilized lineage Grandpa bred from
families even the household cannot name. Pip remains its only member.

### D50 — Lifespan is a family trait and is inherited (accepted 2026-10-03)

Maximum age differs between families and is a primary trait offspring inherit. Aging
stays a handful of modeling choices (youth, peak, elder) rather than a deep system.
[Aging](GAME-DESIGN.md#aging-and-respectful-mortality).

### D53 — A Colosseum ladder of athletic cups (accepted 2026-10-05)

The Colosseum ladder comes next, ahead of the years with Grandpa. Its lower ranks are
athletic cups: drills chained as legs, scored against rival ranchers' critters for a
placing, with promotion cups between ranks. The top ranks, Champion and Grand Champion
(Grandpa's old title), are reserved for turn-based bouts, built later; D28's turn-based
Colosseum combat arrives there. A balancing simulator sets the climb's pace.
[Colosseum](GAME-DESIGN.md#the-colosseum), [plan 005](exec-plans/active/005-colosseum-ladder.md).

### D52 — Colosseum events on the calendar (implemented 2026-10-04)

The everyday athletic showing is joined by scheduled events on fixed days of every season:
the Hedgerow Dash (speed), Strongpaw Trials (strength), Clever Paws Cup (intelligence),
Meadow Marathon (endurance) and, on each season's last day, the three-leg Grand Exhibition.
Each event chains drills as legs on harder settings, weighs the stats it favours, and has
an entry fee and prizes; legs pay medals and coins, not drill sessions. Save v12 plays the
athletic showing the same way, carrying an exhibition in progress on as its sprint or pull.
[Plan 004 M5](exec-plans/completed/004-training-and-exhibitions.md#m5-evidence--2026-10-04).

### D51 — Routines unlock by practice together (implemented 2026-10-03)

Save v11 gives every critter `practised`, its lifetime count of drills played together; one
session unlocks that drill's routine. Migration counts earlier lifts, pacing and log tosses
from their skills, and gives hoops to the companion of a household with the `trained` flag;
Grandpa's Pip starts empty. A routine draws its result as it starts (usually fair; great or
a flop by condition and bond), runs for a few seconds without input, and counts toward the
day's repeats but not toward practice.
[Plan 004 M2](exec-plans/completed/004-training-and-exhibitions.md#m2-evidence--2026-10-03).

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
| **Critter longevity & end-of-life timing**             | Natural aging and respectful mortality settled; lifespan varies by family and is inherited (D50); 1200-day placeholder is not fixed canon.                                         |
| **Childhood calendar mechanics**                       | Spring-and-summer-only years are settled direction; whether autumn and winter are skipped or time-skipped is undecided until it can be felt in play.                               |
| **Story beats across the Grandpa years**               | What happens in each of the 2–3 years, and the first winter's exact narrative role, are open.                                                                                      |
| **Grandma and wider family**                           | The player lives with grandparents; only Grandpa has canon. Do not invent the rest.                                                                                                |
| **Final place names**                                  | Oakhaven, Bramblewick and the other areas are working names.                                                                                                                       |
| **Gemothy's return**                                   | Finding him again and possibly recruiting him is desired; when, where and how is open.                                                                                             |
