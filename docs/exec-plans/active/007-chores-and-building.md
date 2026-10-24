# 007 — Chores, deliveries and building

**Status:** authorized 2026-10-24 by the product owner ([D56](../../DECISIONS.md#d56--a-chore-board-deliveries-and-building-projects-accepted-2026-10-24)).
M1–M3 complete ([evidence](#evidence--2026-10-24)); awaiting the product owner's playtest.

## Purpose

Expose the work systems already simulated but hidden: barn critters silently do every job
they have learned, goods move only by hand, lumber builds only barn stalls, and stone has
no use. This campaign lets the player set critters to work, has haulers distribute goods
between the stead's containers, and makes lumber and stone the price of upgrades to the
barn, the yard and the cottage, delivered physically to a building site.

**Non-goals:** new learned behaviors (duties reuse foraging and hauling), free placement of
buildings, tools and their wear, cooking beyond one stove recipe, new item kinds.

**Baseline:** `b733bc7`, save v14 (live on Pages). Barn critters forage at 11:00 and haul
mill lumber to the yard chest at 14:00 if they have learned to; a stall costs 4 lumber
from the backpack and 20 coins; mending the barn costs 12 coins.

## Milestones

### M1 — The chore board (save v15)

- [x] A chalkboard beside the barn opens the chore board: every critter you own, where it
      is, what it has learned, and its duties, each switched on or off.
- [x] Duties: forage the glade (foragers), haul the sawmill's lumber to the yard chest,
      deliver building materials, keep the trough stocked, and ship produce from the farm
      box to the pickup (haulers). A duty not yet learned says how to teach it.
- [x] Chores run at fixed hours, done by barn critters and by a companion at home in the
      yard; each costs a little energy and is skipped below the 20-energy reserve.
- [x] v14 saves are carried forward with every duty on (what barn critters did before).

### M2 — Building projects

- [x] Projects: another barn stall, a bigger yard chest, a deeper trough, larger sawmill
      hoppers, and a kitchen stove in the cottage. Each needs lumber, some stone, coins and
      time; one is under way at a time, planned at its place or on the chore board.
- [x] A planned project marks a building site where materials are delivered by hand, or by
      haulers from the yard chest; the site shows what has arrived. Building spends the
      coins, time and some energy; plans can be set aside, returning what was delivered.
- [x] The stove cooks feed from home-grown wheat and turnips.

### M3 — Verification

- [x] Unit tests (duties, chores, deliveries, projects, capacities, v14 migration, damaged
      saves), a browser test of planning, delivering and building, lint, build, PWA,
      inspected screenshots, the full browser suite.

## Decisions (routine, this campaign)

Provisional numbers, to be tuned in play: chore hours (forage 11:00, haul 14:00, deliver
15:00, stock 17:00, ship 18:00), 4 energy a chore, loads (2 lumber hauled, 3 materials
delivered, 4 produce shipped), and the project table in `projects.ts`. Mending the barn
stays a coin cost: it is the first day's goal, before the sawmill is introduced.

Routine, decided while building: one project at a time; plans can be started at their place
(barn, yard chest, trough, sawmill, hearth) or on the board; the follower does the hauling
duties when at home in the yard but forages only beside you; setting plans aside is never
the default key (a new `secondary` flag on dock actions); the chalkboard is read from the
barn's dock rather than being a target of its own, which took the dock from the barn and
the fallen timber in the first full browser run; sites stand in the open in front
of the barn, chest and sawmill, and beside the hearth.

## Evidence — 2026-10-24

- Host: `projects.ts` (`DUTIES`, `CHORE`, `PROJECTS`, `STOVE`, `dutyLearned`,
  `planBlocked`, `stillNeeded`, `upgradedCapacity`); in `host.ts` the chore board
  (`read-chores` in the barn's dock, `choreBoard()`, `duty:` and `plan:` actions), `chores()` replacing
  `barnChores`, the building site (`describeSite`, `deliver`, `build`, `setAside`) and the
  stove's `cook`. Save v15 with `Critter.duties`, `GameState.project` and `built`; v14 saves
  are carried forward (`fromV14`), container capacities follow `built`.
- App: the chore board panel (duties per critter with their hours, the project under way,
  plans), the site in the bag screen, quests for the project, journey steps for the board
  and a first build. World: the chalkboard, the site's stakes and growing pile, the stove.
- Unit tests: 209 passed, including `projects.spec.ts` (switching duties, each chore at its
  hour and its energy and reserve, the companion at home but not in town, one project at a
  time, delivery and building, setting aside, the stove, the v14 migration, damaged saves).
- Browser: `e2e/hauling.spec.ts` sets a duty and plans a stall on the board, delivers and
  builds it and reloads (desktop and phone). Inspected:
  [the site supplied](../evidence/007-m1/site-supplied.png),
  [the board on a phone](../evidence/007-m1/chore-board-phone.png); in the dev server, a
  companion's 15:00 delivery, the stove built in the cottage.
- Gates: lint, production build (bundle 169 kB over its budget warning; 150 kB at
  `b733bc7`), PWA check, and the full browser suite: 78 passed and 53 skipped by project,
  with one controller test failing; it pressed Start before the game loop had started (a
  race this campaign's builds lost every time), and now waits for the world first. The
  controller file then passed twice over.

## Current handoff

M1–M3 complete. Next: the product owner's playtest on the published site; tune the
provisional chore hours, loads and project costs from it.
