# Decisions and open questions

Settled direction from the September 25–26, 2026 discussion, recorded during the
2026-09-26 bootstrap. [GAME-DESIGN.md](GAME-DESIGN.md) owns the full product
specification; this is the compact rationale/index. “Accepted” means design
direction, not implemented functionality. New decisions should have a date,
status, reason, and an owning document; supersede explicitly rather than keeping
contradictory instructions alive.

## Accepted decisions

| ID  | Decision                                                                                              | Rationale / owning reference                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D01 | Prove the one-critter daily loop before building the full prologue.                                   | Enjoyable play must earn attachment; minimal architecture preparation prevents compounding prototype assumptions. [Roadmap](ROADMAP.md).                                                                                 |
| D02 | Grandpa owns ancient expert Pip; Pip substantially outlives Grandpa.                                  | Inherited care, continued routines, and teaching younger critters carry the household's legacy. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                                                         |
| D03 | Begin in childhood; Grandpa's unavoidable death after roughly 2–3 narrative years marks independence. | Responsibility and competence frame progression. Exact calendar/pacing remains open. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                                                                    |
| D04 | Choose exactly one starter through an eventual interactive acquisition opening.                       | One companion should feel consequential; ownership grows with competence and facilities. [Acquisition](GAME-DESIGN.md#opening-and-acquisition).                                                                          |
| D05 | Target three visible active critters; distinguish active companions from owned/housed roster.         | Pip and a cousin's companion can demonstrate a party without granting three owned creatures. [Ownership](GAME-DESIGN.md#ownership-and-physical-presence).                                                                |
| D06 | Generalize observation-to-autonomy learning, with eventual critter teachers.                          | Useful learned behavior is central; berry knowledge is one prototype of the pattern. [Learning](GAME-DESIGN.md#learning-work-and-the-daily-loop).                                                                        |
| D07 | Nine foundational families; Brindlekin may be a stabilized lineage.                                   | Leave room for ancestry and authored morphology rather than locking the prototype into a foundational taxonomy. [Families](GAME-DESIGN.md#families-lineages-and-gene-combination).                                       |
| D08 | Technology can combine any two critters; it is normal in the setting and expensive to use.            | Chimeras belong to the main husbandry game. Stable/fertile lineages are possible; origin lore is unnecessary. [Gene combination](GAME-DESIGN.md#families-lineages-and-gene-combination).                                 |
| D09 | Author the valid morphology of family pairings; name individual critters freely.                      | Charm and useful roles need deliberate design. Do not infer globally player-named species. [Families](GAME-DESIGN.md#families-lineages-and-gene-combination).                                                            |
| D10 | Natural aging/death with genetically variable longevity; Colosseum competition is nonlethal.          | Preserve long-term attachment without making ordinary contests lethal risks. No routine accidental deaths in current scope. [Life cycle](GAME-DESIGN.md#life-cycle-and-competition).                                     |
| D11 | Colosseum is a recurring multi-purpose venue; work/farming/upgrades deepen over time.                 | All four stats and families need useful niches beyond combat. [Daily loop](GAME-DESIGN.md#learning-work-and-the-daily-loop).                                                                                             |
| D12 | Cousin begins friendly competitive and is secondary; protagonist can be scripted for now.             | Depth belongs first in raising critters, not relationship branching or character customization. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                                                         |
| D13 | Preserve local authority, persistent identity, deterministic outcomes, and protected saves.           | These are verified prototype boundaries worth keeping. A future server is not current work. [Architecture](ARCHITECTURE.md).                                                                                             |
| D14 | Shared project docs, thin tool entrypoints, bounded execution plans.                                  | Avoid duplicated truth and repeatedly loading unrelated context. [Plan conventions](exec-plans/README.md).                                                                                                               |
| D15 | Individual value is independent of usefulness.                                                        | Care is appropriate for every critter; value is not tied to performance. [Core promise](GAME-DESIGN.md#core-promise-and-priority).                                                                                       |
| D16 | Store individuals in `critters`, `ownerId`, `activeCritterId`; save schema v2.                        | Clean individual identity, safe v1 migration, and dormant NPC references. [Architecture](ARCHITECTURE.md#save-contract).                                                                                                 |
| D17 | Store per-individual behavior progress; define authored behaviors; save v3.                           | Generalize learning beyond hardcoded berry fields without introducing a planner. [Architecture](ARCHITECTURE.md#save-contract).                                                                                          |
| D18 | After foundational work, implementation milestones must have player-visible gameplay consequences.    | Architectural preparation without player-visible impact belongs in subtasks, not product milestones. [Milestone rules](exec-plans/active/001-deepen-one-critter-daily-loop.md).                                          |
| D19 | Grandpa's Colosseum championship, market history, and Pip's fortune origin are canonical backstory.   | Rich narrative context available for organic revelation without front-loading into the opening. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                                                         |
| D20 | Critter ownership, party membership, and active working companion are distinct concepts.              | Pip can remain Grandpa-owned while accompanying the party; player-only active companion is temporary Stage-1 limitation. [Ownership](GAME-DESIGN.md#ownership-and-physical-presence).                                    |
| D21 | M3 daily choice: energy tradeoff, daytime Rest together at nook, retuned costs, and compact dock UI.  | Meaningful daily routines, recovery without sleep/death/grind, and unoccluded world navigation. [Plan](exec-plans/active/001-deepen-one-critter-daily-loop.md#m3--make-care-effort-and-recovery-produce-a-daily-choice). |
| D22 | Human playtest instructions must explicitly explain fresh-start reset vs. save migration.             | Shift+F5 does not clear IndexedDB; backtick developer reset is required for fresh-start testing. [Development](DEVELOPMENT.md#work-and-verification).                                                                    |
| D23 | Local verification gates before commit/push; do not hold sessions open to poll remote CI.             | Quality gates verified locally; remote CI remains independent release verification. [Development](DEVELOPMENT.md#work-and-verification).                                                                                 |

### D15 — Individual value is independent of usefulness (accepted 2026-09-26)

A critter’s usefulness and a critter’s value are not the same thing. Raising,
breeding, specialization, and competition may reward different abilities while
care remains appropriate for every individual. The campaign is named **Deepen the
One-Critter Daily Loop**, and M1 is **Establish distinct critter identity and
ownership**. This wording correction changes neither scope nor acceptance
criteria. The principle belongs to the [core game promise](GAME-DESIGN.md#core-promise-and-priority).

### D16 — Minimal identity model and save v2 (implemented 2026-09-26)

Store individuals in `critters`, ownership in each `ownerId`, and the one playable
selection in `activeCritterId`. Resolve by ID, never array position. Per-individual
care and participant-bound training prevent one individual's actions from changing
another. Other individuals remain dormant; no roster UI or NPC simulation is implied.
Fresh games use provisional Mallow without settling final starter acquisition.

Migrate populated v1 saves explicitly, keeping their original player-owned individual
and all progress. Bind unfinished practice/race to that same ID and resume without
recharging or rerolling. Validate before normal saving; rejected records remain
intact. This is the smallest boundary needed for the next learning milestone,
not a broad party/story framework. [Architecture](ARCHITECTURE.md#save-contract)
owns the exact contract; the [M1 record](exec-plans/active/001-deepen-one-critter-daily-loop.md#m1-evidence--2026-09-26)
owns verification and limitations.

### D17 — Authored learning and save v3 (implemented 2026-09-26)

Use one small behavior definition table and per-individual numeric progress keyed
by stable behavior ID. Only `sunberry-foraging` exists in M2. Stages, gains, hints,
and milestones are authored data; resource selection and work/rewards stay explicit
host rules. This generalizes learning without introducing a planner or teaching NPC.
Knowledge, acquired skill, and genetic aptitude remain distinct.

V2 berry knowledge migrates exactly for every individual; v1 chains through the
existing identity migration. Loading does not replay milestones or rewards. Keep
uncapped legacy observation values, including those above the practice ceiling;
subsequent practice must not reduce them. Unknown, conflicting, or damaged learning
data blocks saving. The [save contract](ARCHITECTURE.md#save-contract) owns validation
details; the [M2 record](exec-plans/active/001-deepen-one-critter-daily-loop.md#m2-evidence--2026-09-26)
owns verification. Existing berry costs and pace are unchanged; recovery experiments
belong to M3 and are not part of this decision.

### D18 — Player-visible milestone rule after foundation (accepted 2026-09-26)

Following foundational milestones M1 and M2, any implementation milestone in the
campaign must produce a clear, observable consequence during ordinary gameplay.
Work that solely establishes underlying architecture without presenting a tangible
change in play should be organized as a supporting subtask rather than represented
as an independent product milestone.

### D19 — Canonical narrative background for Grandpa and Pip (accepted 2026-09-26)

Grandpa was the Colosseum champion before his retirement and was well-known in the
surrounding community. He participated actively in the markets and ultimately spent
the fortune accumulated across his life on the creation of Pip. The player grows up
knowing him simply as Grandpa and does not realize his reputation or the cost of Pip.
Later in life, townspeople may remark that the player reminds them of Grandpa and
that he would have been proud. These facts are settled background; they must not be
front-loaded into the opening sequence, but left for natural discovery.

### D20 — Distinction between ownership, party, and active companion (accepted 2026-09-26)

A critter's established owner (`ownerId`), party membership (inclusion in the
traveling party), and status as the active working companion (`activeCritterId`)
are conceptually separate. Pip can remain owned by Grandpa while joining the party
and acting as the active companion. The Stage-1 rule requiring the active companion
to be player-owned is a temporary implementation limitation, not permanent canon.

### D21 — M3 daily choice, daytime rest, and compact interaction dock (accepted 2026-09-26)

M3 shifts the core daily loop from mindless chore completion to a deliberate daily
choice: whose energy to spend (player vs. critter), what to preserve condition for
(work vs. training or competition), and whether to trade daytime clock minutes for
recovery via **Rest together** at the companion's nook. Work and training costs are
retuned so energy is a real constraint. In addition, the intrusive nearby-interaction
card is replaced with a compact bottom interaction dock to preserve view of the world.

M3 implementation uses the existing stamina/hunger model and save v3. Rest and
effort parameters remain provisional; independent work keeps a small energy reserve
that explicit cues may spend. Current rules are in
[Architecture](ARCHITECTURE.md#care-effort-recovery-and-the-interaction-dock), with
routine comparisons and the pending human product assessment in the active plan.

### D22 — Testing process: fresh-start vs. migration instructions (accepted 2026-09-26)

Because IndexedDB persists homestead state across browser hard reloads (Shift+F5),
human test instructions must clearly specify how to perform a clean start: press
backtick (`` ` ``) to open the developer field kit, select "Reset saved game", and
confirm. Testing must explicitly distinguish fresh-start evaluation (e.g. starter Mallow)
from migration testing (e.g. legacy save with Pip).

### D23 — Local verification gate and non-blocking remote CI (accepted 2026-09-26)

Implementation agents must run required quality gates locally first. Once local
checks pass, work is committed and pushed, with remote CI status noted as pending.
Sessions should not remain open or poll GitHub Actions unless specifically tasked
with deployment or CI debugging.

## Open or exploratory — do not invent canon

| Question                                                                                    | Current boundary / when it matters                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact years, playable weeks, seasonal calendar, and timeskip pacing                         | Rough childhood span is settled; ratios and event cadence are not. Resolve for the prologue/calendar campaign.                                             |
| First winter after Grandpa's death                                                          | Promising thematic note, not mandatory.                                                                                                                    |
| Lifespans, aging effects, care influence, and Pip's eventual death timing                   | Natural death/long genetic variation is accepted; no numeric balance is settled. Prototype 1200-day data is not a decision.                                |
| Pip's exact ancestry and final presentation                                                 | The conversation used different pronouns; legacy prototype Pip was female. Avoid changing saved sex or asserting finalized ancestry from that placeholder. |
| Party unlock steps, housing capacities, and inactive critter routines                       | Three active is the target; housing expands ownership. Exact unlock rules are open.                                                                        |
| Natural compatibility and stabilization/fertility rules                                     | Technology permits any parental pairing; viable offspring does not itself settle fertility of every offspring.                                             |
| Gene-combination price, access timing, facilities, name, and multi-family morphology        | Normal-but-expensive is settled. “Gene-Loom” is provisional; no origin explanation is required.                                                            |
| Training disciplines, recovery model, day pacing, and repeatable competition incentives     | Evaluate in the one-critter campaign. Proposed milestone mechanics are experiments, not permanent product promises.                                        |
| Full farming/work economy, building trees, event rotation, and starter candidates           | Develop in playable stages after the daily-loop evidence.                                                                                                  |
| Character customization, cousin detail, dangerous exploration, multiplayer, Steam packaging | Optional/deferred; no implementation should be inferred from their mention.                                                                                |

Bootstrap implementation policy: preserve a migrated prototype individual and its
progress even if named Pip. Do not silently convert that novice into Grandpa's
expert or rewrite personal history to fit later story. A new-game prototype can
use a distinct provisional starter without implementing the opening. This policy
protects saves; it does not settle the final starter roster.
