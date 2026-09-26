# Decisions and open questions

Settled direction from the September 25–26, 2026 discussion, recorded during the
2026-09-26 bootstrap. [GAME-DESIGN.md](GAME-DESIGN.md) owns the full product
specification; this is the compact rationale/index. “Accepted” means design
direction, not implemented functionality. New decisions should have a date,
status, reason, and an owning document; supersede explicitly rather than keeping
contradictory instructions alive.

## Accepted decisions

| ID  | Decision                                                                                              | Rationale / owning reference                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Prove the one-critter daily loop before building the full prologue.                                   | Enjoyable play must earn attachment; minimal architecture preparation prevents compounding prototype assumptions. [Roadmap](ROADMAP.md).                                                 |
| D02 | Grandpa owns ancient expert Pip; Pip substantially outlives Grandpa.                                  | Inherited care, continued routines, and teaching younger critters carry the household's legacy. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                         |
| D03 | Begin in childhood; Grandpa's unavoidable death after roughly 2–3 narrative years marks independence. | Responsibility and competence frame progression. Exact calendar/pacing remains open. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                                    |
| D04 | Choose exactly one starter through an eventual interactive acquisition opening.                       | One companion should feel consequential; ownership grows with competence and facilities. [Acquisition](GAME-DESIGN.md#opening-and-acquisition).                                          |
| D05 | Target three visible active critters; distinguish active companions from owned/housed roster.         | Pip and a cousin's companion can demonstrate a party without granting three owned creatures. [Ownership](GAME-DESIGN.md#ownership-and-physical-presence).                                |
| D06 | Generalize observation-to-autonomy learning, with eventual critter teachers.                          | Useful learned behavior is central; berry knowledge is one prototype of the pattern. [Learning](GAME-DESIGN.md#learning-work-and-the-daily-loop).                                        |
| D07 | Nine foundational families; Brindlekin may be a stabilized lineage.                                   | Leave room for ancestry and authored morphology rather than locking the prototype into a foundational taxonomy. [Families](GAME-DESIGN.md#families-lineages-and-gene-combination).       |
| D08 | Technology can combine any two critters; it is normal in the setting and expensive to use.            | Chimeras belong to the main husbandry game. Stable/fertile lineages are possible; origin lore is unnecessary. [Gene combination](GAME-DESIGN.md#families-lineages-and-gene-combination). |
| D09 | Author the valid morphology of family pairings; name individual critters freely.                      | Charm and useful roles need deliberate design. Do not infer globally player-named species. [Families](GAME-DESIGN.md#families-lineages-and-gene-combination).                            |
| D10 | Natural aging/death with genetically variable longevity; Colosseum competition is nonlethal.          | Preserve long-term attachment without making ordinary contests lethal risks. No routine accidental deaths in current scope. [Life cycle](GAME-DESIGN.md#life-cycle-and-competition).     |
| D11 | Colosseum is a recurring multi-purpose venue; work/farming/upgrades deepen over time.                 | All four stats and families need useful niches beyond combat. [Daily loop](GAME-DESIGN.md#learning-work-and-the-daily-loop).                                                             |
| D12 | Cousin begins friendly competitive and is secondary; protagonist can be scripted for now.             | Depth belongs first in raising critters, not relationship branching or character customization. [Household](GAME-DESIGN.md#household-childhood-and-inheritance).                         |
| D13 | Preserve local authority, persistent identity, deterministic outcomes, and protected saves.           | These are verified prototype boundaries worth keeping. A future server is not current work. [Architecture](ARCHITECTURE.md).                                                             |
| D14 | Shared project docs, thin tool entrypoints, bounded execution plans.                                  | Avoid duplicated truth and repeatedly loading unrelated context. [Plan conventions](exec-plans/README.md).                                                                               |

### D15 — Individual value is independent of usefulness (accepted 2026-09-26)

A critter’s usefulness and a critter’s value are not the same thing. Raising,
breeding, specialization, and competition may reward different abilities while
care remains appropriate for every individual. The campaign is named **Deepen the
One-Critter Daily Loop**, and M1 is **Establish distinct critter identity and
ownership**. This wording correction changes neither scope nor acceptance
criteria. The principle belongs to the [core game promise](GAME-DESIGN.md#core-promise-and-priority).

## Open or exploratory — do not invent canon

| Question                                                                                    | Current boundary / when it matters                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact years, playable weeks, seasonal calendar, and timeskip pacing                         | Rough childhood span is settled; ratios and event cadence are not. Resolve for the prologue/calendar campaign.                                         |
| First winter after Grandpa's death                                                          | Promising thematic note, not mandatory.                                                                                                                |
| Lifespans, aging effects, care influence, and Pip's eventual death timing                   | Natural death/long genetic variation is accepted; no numeric balance is settled. Prototype 1200-day data is not a decision.                            |
| Pip's exact ancestry and final presentation                                                 | The conversation used different pronouns; current prototype is female. Avoid changing saved sex or asserting finalized ancestry from that placeholder. |
| Party unlock steps, housing capacities, and inactive critter routines                       | Three active is the target; housing expands ownership. Exact unlock rules are open.                                                                    |
| Natural compatibility and stabilization/fertility rules                                     | Technology permits any parental pairing; viable offspring does not itself settle fertility of every offspring.                                         |
| Gene-combination price, access timing, facilities, name, and multi-family morphology        | Normal-but-expensive is settled. “Gene-Loom” is provisional; no origin explanation is required.                                                        |
| Training disciplines, recovery model, day pacing, and repeatable competition incentives     | Evaluate in the one-critter campaign. Proposed milestone mechanics are experiments, not permanent product promises.                                    |
| Full farming/work economy, building trees, event rotation, and starter candidates           | Develop in playable stages after the daily-loop evidence.                                                                                              |
| Character customization, cousin detail, dangerous exploration, multiplayer, Steam packaging | Optional/deferred; no implementation should be inferred from their mention.                                                                            |

Bootstrap implementation policy: preserve a migrated prototype individual and its
progress even if named Pip. Do not silently convert that novice into Grandpa's
expert or rewrite personal history to fit later story. A new-game prototype can
use a distinct provisional starter without implementing the opening. This policy
protects saves; it does not settle the final starter roster.
