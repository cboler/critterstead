# Architecture and implemented baseline

Source audit: `e60c5b7` on 2026-09-26. This is the implementation authority, not a
claim that every baseline check was rerun during the documentation pass. Subsequent
changes must update the relevant sections. Verification evidence lives with
[execution plans](exec-plans/README.md).

## Boundaries and invariants

| Component                                    | Owns                                                                                                             | Must not own                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [model.ts](../src/app/game/model.ts)         | State, commands, persistent identifiers, save schema types                                                       | Rendering or browser storage                      |
| [content.ts](../src/app/game/content.ts)     | Authored areas, objects, configuration, prototype species definition                                             | Per-frame presentation logic                      |
| [host.ts](../src/app/game/host.ts)           | Local authoritative simulation, command validation, time, movement/collision, rewards, learning, seeded outcomes | Angular, Three.js, or IndexedDB APIs              |
| [storage.ts](../src/app/game/storage.ts)     | Save interface, validation, serialized IndexedDB operations                                                      | Progression rules                                 |
| [app.ts](../src/app/app.ts), template/styles | HUD, menus, input routing, host lifecycle, save scheduling and tab ownership                                     | Direct application of gameplay rules              |
| [world.ts](../src/app/game/world.ts)         | Orthographic Three.js world and presentation feedback, ground-pick requests                                      | Rewards, economy, or authoritative state mutation |

`LocalGameHost` clones its initial state, processes commands through `dispatch`,
and advances the simulation through `update`. Its `state` getter currently exposes
a mutable object; read-only consumption is a discipline, not a deep type-level
guarantee. Angular clones state for UI signals. Keyboard, touch, click-to-walk,
and standard gamepad input reach the same command boundary. The animation loop
runs outside Angular, with UI refreshes routed back through Angular.

Important outcomes depend on state, commands, simulation time, and the central
seeded random source. Do not introduce wall-clock or renderer randomness into
gameplay. Critters remain persistent individuals with stable IDs. This local host
is a possible future authority seam, not an existing remote server or networking
protocol. Prefer platform facilities and existing dependencies over speculative
frameworks, services, or abstractions.

## What exists today

| Area             | Implemented                                                                                                     | Limit / planned distinction                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Companions       | Singular `GameState.critter`, initially `critter-pip`, named Pip, female, age 18 days, Brindlekin               | No owners, roster, active party, Grandpa, cousin, or starter choice. This young novice Pip conflicts with the intended narrative role.                           |
| Individuality    | Name/ID, age counter, sex, personality string, four stats, needs, bond, skills, visual traits, history, results | No renaming UI or developed personality/life-stage simulation. Health is stored; no complete health/mortality system.                                            |
| Genetics         | Parent ID list and string-valued genetics/traits in saves                                                       | No breeding, inheritance, cross-family generator, or fertility model. `lifespanDays: 1200` is authored placeholder data, not implemented death or canon balance. |
| Learning         | `berryKnowledge`, observation, commanded harvest, autonomous nearby foraging                                    | Hardcoded berry-specific stages and thresholds; no generic behavior registry or critter-to-critter teaching.                                                     |
| Care/work        | Petting, feed/treats, hunger, player/critter stamina, timing practice, berry gathering/selling                  | Repeated-day depth is unproven. Strength lacks a meaningful activity in this slice.                                                                              |
| Farming/upgrades | One feed crop: plant, water, grow, harvest; one shed upgrade with visual change and happiness effect            | No barn capacity, broader crops, construction system, or house upgrade tree.                                                                                     |
| Competition      | Once-per-day Clover Cup time trial using three cues, recorded result and coin reward                            | No Colosseum, opponents, combat, schedule, festivals, or tournament system.                                                                                      |
| World            | Bramblewick Yard and Clover Glade, six renewable berry bushes, cottage/shed collision                           | Direct walking, no obstacle pathfinding; one critter render model. No town, story scenes, seasons, or narrative timeskips.                                       |
| Platform         | Angular 22, Three.js, responsive PWA, local saves, standard gamepad mapping, optional synthesized chime         | No account, analytics service, cloud backup, multiplayer, Steam package, or localization system. Physical controller validation remains outstanding.             |

The clock models a full 24-hour game day in about 30 real minutes; actions also
advance game minutes, so a player's day can be shorter. Menus, pause, and hidden
tabs suspend simulation updates. Sleeping advances to the following morning,
restores stamina, and retains progression. Age increments when game days pass.
Seasons, narrative years, natural death, and off-screen catch-up are not implemented.

## Save contract

- `GameState.version` is **1**. IndexedDB database `critterstead`, object store
  `saves`, key `homestead`, database version **1**. Database and game-schema versions
  are separate concepts. There is one save in the current browser profile.
- `validateSave` checks shape, finite values, bounds, IDs, calendar consistency,
  and activity state. Only version 1 is supported; there is **no migration pipeline**.
- Save requests validate and clone at request time, then serialize writes.
  A failed write is surfaced without permanently poisoning the queue.
- Invalid or unsupported saves remain intact. The UI blocks saving until an
  explicit reset; reset is deliberate, not an automatic recovery policy.
- UI commands request saves; movement is covered by periodic active-play saves.
  Journal/day changes, page hide, and visibility changes also trigger saves.
- `app.ts` uses the Web Locks API when available to keep a single writing tab.
  A blocked tab must reload after the owner closes. **There is no equivalent
  fallback lock when Web Locks is unavailable**; do not claim universal protection.
- Storage can be evicted or cleared. No import/export or cloud backup exists.

Future schema work must explicitly migrate supported old saves, preserve progress
and seeded continuity, validate the result, and fail without overwriting the old
record. Include populated legacy and malformed/future fixtures. Never rely on
resetting the player's homestead to make a new model work.

## Evolution needed, not yet implemented

1. Separate individual identity, ownership, roster membership, and active companion
   selection. A future Grandpa-owned Pip and player starter must be independently
   representable. Avoid spreading new `state.critter` assumptions.
2. Generalize learned behavior state and authored definitions, preserving the
   berry prototype's observable progression before adding more jobs. Learned
   knowledge, skill, and genetic aptitude must remain distinguishable.
3. Replace Pip-specific UI/renderer assumptions as needed for the selected
   individual. A compatible old save named Pip must not be silently repurposed as
   Grandpa's ancient expert, stripped of progress, or treated as narrative canon.
4. Later milestones may add story/NPC state, household schedules, housing/party
   occupancy, calendar/life stages, and genetic morphology. Do not build those
   engines merely to prepare for the one-critter campaign.

Exact TypeScript structures and schema versions are implementation decisions made
within the active milestone. The first bounded changes are specified in the
[one-critter plan](exec-plans/active/001-make-one-critter-worth-raising.md).

## Verification and release seams

Host/storage tests cover command authority, resource and care rules, learning,
timing, seeded continuation, identity, and invalid saves. Playwright covers real
browser input, responsive layouts, a complete day, reload, tab ownership, and
damaged/newer save protection. Its full-day test reads precise Angular development
state for observations but still uses player input; it is not a substitute for
fresh-player pacing evaluation. Controller tests mock the standard Gamepad API.

The Angular service worker is enabled only for production. Pages derives its base
path through `actions/configure-pages`; assets and app logic must remain repository
independent. `prepare-pages.mjs` creates the SPA fallback and verifies output.
Commands, offline verification, and platform caveats belong in
[DEVELOPMENT.md](DEVELOPMENT.md).
